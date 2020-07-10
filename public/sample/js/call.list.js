document.addEventListener('DOMContentLoaded', function () {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const callBtn = document.getElementById('callBtn');
    const joinBtn = document.getElementById('joinBtn');
    const exitBtn = document.getElementById('exitBtn');
    const memberBtn = document.getElementById('memberBtn')
  
    let reqNo = 1;
  
    let janustoPeer;
  
    signalSocketIo.on('knowledgetalk', function (data) {
      tLogBox('receive', data);
  
      if (!data.eventOp && !data.signalOp) {
        tLogBox('error', 'eventOp undefined');
      }
  
      if (data.eventOp === 'Login') {
        loginBtn.disabled = true;
        callBtn.disabled = false;
        tTextbox('로그인 되었습니다.');
      }
  
      if (data.eventOp === 'Invite') {
        roomId = data.roomId;
  
        callBtn.disabled = true;
        joinBtn.disabled = false;
      }
  
      if (data.eventOp === 'Call') {
        roomId = data.roomId;
        exitBtn.disabled = false;
        tTextbox('회의에 초대 하였습니다');
      }
      if (data.eventOp === 'Join') {
        roomId = data.roomId;
        joinBtn.disabled = true;
        exitBtn.disabled = false;
      }
  
      if (data.eventOp === 'SDP') {
        if (data.sdp && data.sdp.type === 'answer' && janustoPeer) {
          janustoPeer.processAnswer(data.sdp.sdp);
        }
      }
  
      if (data.eventOp === 'Candidate') {
        if (!data.candidate) return;
  
        let iceData = {
          eventOp: 'Candidate',
          reqNo: reqNo++,
          resDate: nowDate(),
          userId: inputId.value,
          roomId: data.roomId,
          candidate: data.candidate,
          useMediaSvr: 'Y',
          usage: 'cam'
        };
  
        try {
          tLogBox('send', iceData);
          signalSocketIo.emit('knowledgetalk', iceData);
        } catch (err) {
          if (err instanceof SyntaxError) {
            alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
            throw err;
          }
        }
      }
      
      //참여자 확인
      if (data.eventOp === 'ConferenceMemberList') {
        tLogBox('receive(memberlist)', data.result);
        memberlist.innerHTML = null;
        var ui = document.createElement('ui');
        data.result.forEach(item => {
          var li = document.createElement('li');
          li.innerHTML = item.name;
          ui.appendChild(li);
        })
        memberlist.appendChild(ui);
      }
    });
  
  
    function dispose() {
      if (janustoPeer) {
        janustoPeer.dispose();
        janustoPeer = null;
        multiVideo.src = null;
      }
    }
    
    //로그인 버튼 클릭시
    loginBtn.addEventListener('click', function (e) {
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
  
    //회의 초대 버튼
    callBtn.addEventListener('click', function (e) {
      let callData = {
        eventOp: 'Call',
        reqNo: reqNo++,
        userId: inputId.value,
        reqDate: nowDate(),
        reqDeviceType: 'pc',
        serviceType: 'multi',
        targetId: ['melon']
      };
  
      try {
        tLogBox('send', callData)
        signalSocketIo.emit('knowledgetalk', callData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
  
    //회의 참여 버튼
    joinBtn.addEventListener('click', function (e) {
      let joinData = {
        eventOp: 'Join',
        reqNo: reqNo++,
        reqDate: nowDate(),
        userId: inputId.value,
        roomId,
        status: 'accept'
      };
  
      try {
        tLogBox('send', joinData);
        signalSocketIo.emit('knowledgetalk', joinData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    });
  
    //회의 종료 버튼
    exitBtn.addEventListener('click', function (e) {
      loginBtn.disabled = false;
      callBtn.disabled = true;
      joinBtn.disabled = true;
      exitBtn.disabled = true;
      dispose();
      tLogBox('send', exitBtn);
      tTextbox('회의를 종료 합니다.');
    });
  
    // 참여 확인 버튼 클릭시 나오는 부분
    memberBtn.addEventListener('click', function (e) {
      let memberData = {
        eventOp: 'ConferenceMemberList',
        reqNo: reqNo++,
        reqDate: nowDate(),
        roomId
      }
      try {
        tTextbox('참여자 확인');
        tLogBox('send', memberData);
        signalSocketIo.emit('knowledgetalk', memberData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    })
  });