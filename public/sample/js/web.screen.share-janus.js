
document.addEventListener('DOMContentLoaded', function() {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const callBtn = document.getElementById('callBtn');
    const shareBtn = document.getElementById('shareBtn');
    const exitBtn = document.getElementById('exitBtn');
   
    //let signalSocketIo = null;
    let reqNo = 1;
    let roomId;
    // let sdp;
    let janusLocalStream;
    let janusLocalStreamPeer;
    let janusRemoteStreams = {};
    let janusRemoteStreamPeers = {};
    let janusScreenShareStreamPeer;
    let janusScreenShareStream;
    let configuration;
     
    signalSocketIo.on('knowledgetalk', function (data) {
      tLogBox('receive', data);
      console.log('receive', data);
   
      switch (data.eventOp) {
        case 'Login':
          if(callBtn.disabled)
            loginBtn.disabled = true;
            callBtn.disabled = false;
            tTextbox('로그인 되었습니다.')
          break;
   
        case 'Invite':
          roomId = data.roomId;
          callBtn.disabled = true;
          joinBtn.disabled = false;
          break;
   
        case 'Call':
          roomId = data.roomId;
          callBtn.disabled = true;
          shareBtn.disabled = false;
          exitBtn.disabled = false;
   
          if (data.code !== '200') {
            tLogBox('Call err : ', data);
          } else if (data.status === 'accept') {
            if (data.isSfu === true) {
              createSDPOffer(data.videoWidth, data.videoHeight, data.videoFramerate, roomId); // peer 생성 
            } else {
   
            }
          }
          break;
   
        case 'Join':
          joinBtn.disabled = true;
          roomId = data.roomId;
          exitBtn.disabled = false;
          if (data.code !== '200') {
            console.log('111??')
            tLogBox('join err : ', data);
          } else {
            console.log('2222??')
            tLogBox('join data ################  ', data);
            if (data.useMediaSvr === 'Y') {
              //비디오 사이즈 
              createSDPOffer(data.videoHeight, data.videoWidth, data.videoFramerate, roomId);
            }
          }
          break;
   
        case 'SDP':
          roomId = data.roomId;
          exitBtn.disabled = false;
          if (data.sdp && data.sdp.type === 'offer' && data.usage === 'cam') {
            createSDPAnwser(data);
          } else if (data.sdp && data.sdp.type === 'answer' && data.usage === 'cam' ) {
            janusLocalStreamPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } else if (data.sdp && data.sdp.type === 'offer' && data.usage === 'screen') {
            if (data.isSfu === true) {
              createScreenShareSdpAnswer(data);
            }
          } else if (data.sdp && data.sdp.type === 'answer' && data.usage === 'screen') {
            if (data.useMediaSvr === 'Y') {
              if (data.type === 'maker') {
                if (data.sdp) {
                  if (data.isSfu === true) {
                    janusScreenShareStreamPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
                  }
                }
              }
            }
          }
          break;
   
        case 'Candidate' :
          if (data.useMediaSvr=== 'Y') {
            if (data.usage ==='screen') {
              if (data.candidate) {
                janusScreenShareStreamPeer.addIceCandidate(data.candidate);
              } 
            }
          }
          break;
   
        case 'SessionReserve' : 
          if (data.code !== '200') {
            tLogBox('SessionReserve error');
          } else {
            if (data.multiType === 'Y') {
              tLogBox('SessionReserve   ##### ', data);
              console.log('createScreenShareSdpOffer function start')
              createScreenShereSdpOffer();
            }
          }
          break;
   
        case 'ScreenShareConferenceEnd' : 
          if(data.useMediaSvr === 'Y') {
            let sendData = {
              eventOp: 'SessionReserveEnd',
              reqNo: reqNo++,
              userId: inputId.value,
              reqDate: nowDate(),
              roomId : data.roomId
            };
            tLogBox('send', sendData);
            signalSocketIo.emit('knowledgetalk', sendData);
   
          }
   
          break;
        case 'ScreenShareConferenceEndSvr' :
          let screenSharingVideo = document.getElementById('ScreenSharingVideo');
          if (screenSharingVideo.style.display === 'block') {
            screenSharingVideo.style.display = 'none';
          }
          if (data.useMediaSvr === 'Y') {
              ScreenShareConferenceEnd();
            }
          break;
      
      }
    });
   
   
   
    const createScreenShareSdpAnswer = async(data) => {
   
      try {
   
        janusScreenShareStreamPeer = new RTCPeerConnection(configuration);
        tLogBox('peer connection ::: ', janusScreenShareStreamPeer);
        console.log('peer connection ::: ',janusScreenShareStreamPeer);
   
        janusScreenShareStreamPeer.ontrack = (e) => {
          tLogBox('check',e);
          console.log('check',e)
          setScreenVideo(e.streams[0]);
        };
   
   
        janusScreenShareStreamPeer.onicecandidate = (e) => {
          if (!e.candidate) return;
          
          let sendData = {
            eventOp: 'Candidate',
            reqNo: data.reqNo,
            reqDate: data.reqDate,
            userId: data.userId,
            roomId: data.roomId,
            useMediaSvr: 'Y',
            usage: 'screen',
            candidate: e.candidate,
            isSfu: true
          }
          tLogBox(' ###  Candidate Answer send #### ', sendData);
          signalSocketIo.emit('knowledgetalk', sendData);
        }
   
        
        await janusScreenShareStreamPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await janusScreenShareStreamPeer.createAnswer().then(sdp => {
          janusScreenShareStreamPeer.setLocalDescription(sdp);

        })
        //추가부분
        let sdp = await janusScreenShareStreamPeer.createOffer();
        await janusScreenShareStreamPeer.setLocalDescription(sdp);

        janusScreenShareStreamPeer.onicegatheringstatechange = async (ev) => {
          let connection = ev.target;
            switch (connection.iceGatheringState) {
              case 'gathering':
                break;
              case 'complete':
                let sendData = {
                  eventOp: 'SDP',
                  reqNo: data.reqNo,
                  userId: data.userId,
                  type: 'user',
                  roomId: data.roomId,
                  reqDate: data.reqDate,
                  isHWAccelation: false,
                  isRTPShare: false,
                  useMediaSvr: 'Y',
                  usage: 'screen',
                  sdp: sdp,
                  isSfu: true
                };
    
                tLogBox('send', sendData);
                signalSocketIo.emit('knowledgetalk', sendData);
                break;
            }
          }
        } catch (error) {
         tLogBox(' janusScreenShareStreamPeer [error]    ', error);
        };
   
   
        janusScreenShareStreamPeer.oniceconnectionstatechange = (e) => {
          if ((janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'disconnected') ||
            (janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'failed') ||
            (janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'closed')) {
            tLogBox('screenshare Disconnected.. ');
   
            //TODO remote video object 제거
            janusScreenShareStreamPeer.close();
            janusScreenShareStreamPeer = null;
   
          }
        }
   
    //   } catch (error) {
    //     tLogBox('error' , error);
      }
      
    // };
   
    const createScreenShereSdpOffer = async () => {
      try {
        let contranint = { video : true, audio : false};
   
        try {
          janusScreenShareStream = await navigator.mediaDevices.getDisplayMedia(contranint);
          
        } catch (error) {
          tLogBox('createScreenShereSdpOffer'  , error);
        }
        janusScreenShareStreamPeer = new RTCPeerConnection(configuration);
        
        janusScreenShareStreamPeer.onicecandidate = (e) => {
          if (!e.candidate) return;
          let sendData = {
            eventOp: 'Candidate',
            reqNo: reqNo++,
            reqDate: nowDate(),
            userId: inputId.value,
            roomId: roomId,
            useMediaSvr: 'Y',
            usage: 'screen',
            candidate: e.candidate,
            isSfu: true
          }
          tLogBox(' ###  Candidate Offer send #### ', sendData);
          signalSocketIo.emit('knowledgetalk', sendData);
        }
        
        janusScreenShareStream.getTracks().forEach(track => {
          janusScreenShareStreamPeer.addTrack(track, janusScreenShareStream);
        });
        try {
          let sdp = await janusScreenShareStreamPeer.createOffer();
          await janusScreenShareStreamPeer.setLocalDescription(sdp);
   
          janusScreenShareStreamPeer.onicegatheringstatechange = async (ev) => {
            let connection = ev.target;
              switch (connection.iceGatheringState) {
                case 'gathering':
                  break;
                case 'complete':
                  let sendData = {
                    eventOp: 'SDP',
                    reqNo: reqNo++,
                    userId: inputId.value,
                    type: 'maker',
                    roomId: roomId,
                    reqDate: nowDate(),
                    isHWAccelation: false,
                    isRTPShare: false,
                    useMediaSvr: 'Y',
                    usage: 'screen',
                    sdp: sdp,
                    isSfu: true
                  };
                  tLogBox('send', sendData);
                  signalSocketIo.emit('knowledgetalk', sendData);
                  break;
              }
            }
          } catch (error) {
           tLogBox(' janusScreenShareStreamPeer [error]    ', error);
          };
   
        janusScreenShareStreamPeer.onconnectionstatechange = (e) => {
          if ((janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'disconnected') ||
            (janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'failed') ||
            (janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'closed')) {
              
              janusScreenShareStreamPeer.close();
              janusScreenShareStreamPeer = null;
   
              if (janusScreenShareStream) {
                janusScreenShareStream.getVideoTracks()[0].stop();
                janusScreenShareStream = null;
              }
              tLogBox(janusScreenShareStream)
              let remoteVideo = document.querySelector('#screen-share-video');
              if (remoteVideo) {
                remoteVideo.remove();
              }
          } else if ((janusScreenShareStreamPeer && janusScreenShareStreamPeer.iceConnectionState === 'connected')) {
            setScreenVideo(janusScreenShareStream);
          }
        }
      } catch (err) {
        tLogBox('aaaa' , err)
      }
    }
   
    const setScreenVideo = (stream) => {
      let isVideo = document.getElementById('screen-share-video');
   
      if (isVideo) {
        let video = document.createElement('video');
        console.log('@@@@@@@@@@@@', stream)
        console.log('video',video)
        video.id = 'screenshare-video';
        video.style.width ='750px';
        video.style.height='450px';
        video.autoplay = true;
   
        if(stream) {
          video.srcObject = stream;
        }
        isVideo.appendChild(video);
      }
   
    }
   
   
    const ScreenShareConferenceEnd = () => {
      let sendData = {
        eventOp: 'ScreenShareConferenceEnd',
        reqNo: reqNo++,
        userId: inputId.value,
        reqDate: nowDate(),
        roomId: data.roomId,
        useMediaSvr: 'Y'
      };
      tLogBox('send', sendData);
      signalSocketIo.emit('knowledgetalk', sendData);
    }
   
   
    async function createSDPOffer(width, height, framerate, roomId) {
      let multiVideoBox = document.querySelector('#VIDEOONETOMANY');
      try {
        janusLocalStream = await navigator.mediaDevices.getUserMedia(
          { video : {width:width, height:height, frameRate: { ideal: framerate, max: framerate } }, audio: true}
        );
        streamSize = Object.keys(janusRemoteStreams).length;
        let videoTagClassName;
   
        if (streamSize > 0 && streamSize <= 3) {
          videoTagClassName = 'video-twobytwo';
        } else if (streamSize > 3 && streamSize <= 8) {
          videoTagClassName = 'video-threebythree';
        } else if (streamSize > 8) {
          videoTagClassName = 'video-fourbyfour';
        }
        let videoContainner = document.createElement('dd');
        videoContainner.classList = 'multi-video';
        let multiVideo2 = document.createElement('video');
        multiVideo2.autoplay = true;
        multiVideo2.id = 'multiVideo-local';
        multiVideo2.srcObject = janusLocalStream;
   
   
        videoContainner.appendChild(multiVideo2);
        multiVideoBox.classList = videoTagClassName;
        multiVideoBox.appendChild(videoContainner);
   
   
        janusLocalStreamPeer = new RTCPeerConnection(configuration);
        janusLocalStream.getTracks().forEach(track => {
          janusLocalStreamPeer.addTrack(track, janusLocalStream);
        });
   
        try {
   
          let sdp = await janusLocalStreamPeer.createOffer();
          await janusLocalStreamPeer.setLocalDescription(sdp);
          janusLocalStreamPeer.onicegatheringstatechange = async (ev) => {
            let connection = ev.target;
   
            switch (connection.iceGatheringState) {
              case 'gathering':
                break;
              case 'complete':
                let sdpData = {
                  eventOp: 'SDP',
                  reqNo: reqNo,
                  userId: inputId.value,
                  reqDate: nowDate(),
                  sdp,
                  roomId: roomId,
                  useMediaSvr: 'Y',
                  usage: 'cam',
                  isSfu: true
                };
                tLogBox('send', sdpData);
                signalSocketIo.emit('knowledgetalk', sdpData);
                break;
            }
          }
   
        } catch (error) {
          if (err instanceof SyntaxError) {
            console.error(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
        }
   
      } catch (err) {
        tLogBox('err', err);
      }
    }
   
    async function createSDPAnwser(data) {
   
      let multiVideoBox = document.querySelector('#VIDEOONETOMANY');
      try {
        let displayId = data.displayId;
        janusRemoteStreamPeers[displayId] = new RTCPeerConnection(configuration);
   
        janusRemoteStreamPeers[displayId].ontrack = function (e) {
          console.log(e.stream)
          janusRemoteStreams[displayId] = e.streams[0];
          streamSize = Object.keys(janusRemoteStreams).length;
          let videoTagClassName;
          if (streamSize > 0 && streamSize <= 4) {
            videoTagClassName = 'video-twobytwo';
          } 
   
          let videoContainner = document.createElement('dd');
          videoContainner.classList = 'multi-video';
   
          if(!document.getElementById('multiVideo-' + data.displayId)){

            let multiVideo = document.createElement('video');
            multiVideo.autoplay = true;
            multiVideo.srcObject = janusRemoteStreams[displayId];
            multiVideo.id = 'multiVideo-' + data.displayId;
     
            videoContainner.appendChild(multiVideo);
            multiVideoBox.classList = videoTagClassName;
            multiVideoBox.appendChild(videoContainner);
          }
        }
   
   
        await janusRemoteStreamPeers[displayId].setRemoteDescription(new RTCSessionDescription(data.sdp));
        let answerSdp = await janusRemoteStreamPeers[displayId].createAnswer();
        await janusRemoteStreamPeers[displayId].setLocalDescription(answerSdp);
   
        let sdpData = {
          eventOp: 'SDP',
          reqNo: reqNo++,
          userId: inputId.value,
          reqDate: nowDate(),
          sdp: answerSdp,
          roomId: data.roomId,
          useMediaSvr: 'Y',
          usage: 'cam',
          isSfu: true,
          pluginId: data.pluginId
        };
   
        tLogBox('#### answerSdp SEND ###', sdpData);
        signalSocketIo.emit('knowledgetalk', sdpData);
   
      } catch (err) {
        tLogBox(err)
      }
    }
   
   
    loginBtn.addEventListener('click', function(e) {
      let loginData = {
        eventOp: 'Login',
        reqNo: reqNo++,
        userId: inputId.value,
        userPw: passwordSHA256(inputPw.value),
        reqDate: nowDate(),
        deviceType: 'pc'
      };
   
      try {
        tLogBox('send', loginData);
        signalSocketIo.emit('knowledgetalk', loginData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    callBtn.addEventListener('click', function (e) {
      let callData = {
        eventOp: 'Call',
        reqNo: reqNo++,
        userId: inputId.value,
        reqDate: nowDate(),
        reqDeviceType: 'pc',
        serviceType: 'multi',
        targetId: ['apple','orange', 'melon'],
        isSfu: true
      };
   
      try {
        tLogBox('send', callData);
        signalSocketIo.emit('knowledgetalk', callData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    joinBtn.addEventListener('click', function (e) {
      let joinData = {
        eventOp: 'Join',
        reqNo: reqNo++,
        reqDate: nowDate(),
        userId: inputId.value,
        roomId,
        status: 'accept',
        isSfu: true
      };
   
      try {
        tLogBox('send', joinData);
        console.log('send', joinData)
        signalSocketIo.emit('knowledgetalk', joinData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    shareBtn.addEventListener('click', function (e) {
   
      let shareData ={
        eventOp: 'SessionReserve',
        reqNo: reqNo++,
        userId: inputId.value,
        reqDate: nowDate(),
        roomId: roomId
      };
   
      try {
        tLogBox('### shareData send ### ', shareData);
        console.log('### shareData send ### ', shareData);
        signalSocketIo.emit('knowledgetalk', shareData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
   
    exitBtn.addEventListener('click', function (e) {
      loginBtn.disabled = false;
      callBtn.disabled = true;
      joinBtn.disabled = true;
      exitBtn.disabled = true;
 
      let sendData = {
        eventOp: 'ExitRoom',
        reqNo: reqNo++,
        userId: inputId.value,
        userName : inputId.value,
        reqDate: nowDate(),
        roomId: roomId
      };
      try {
        console.log('send', sendData);
        signalSocketIo.emit('knowledgetalk', sendData);

      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
    
  });