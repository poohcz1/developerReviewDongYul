document.addEventListener('DOMContentLoaded', function () {
    const inputId = document.getElementById('inputId');
    const inputPw = document.getElementById('inputPw');
    const loginBtn = document.getElementById('loginBtn');
    const joinBtn = document.getElementById('joinBtn');
    const exitBtn = document.getElementById('exitBtn');
    const chatBtn = document.getElementById('chatBtn');

    let reqNo = 1;
    let configuration = [];

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
            tLogBox('send(login)', loginData);
            console.log('send(login)', loginData);
            signalSocketIo.emit('knowledgetalk', loginData);
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
            status: 'accept'
        };

        try {
            tLogBox('send(join)', joinData);
            console.log('send(join)', joinData);
            signalSocketIo.emit('knowledgetalk', joinData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert(' there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }
    });

    exitBtn.addEventListener('click', function (e) {
        let callEndData = {
            eventOp: 'ExitRoom',
            reqNo: reqNo,
            userId: inputId.value,
            reqDate: nowDate(),
            roomId
        };

        try {
            loginBtn.disabled = true;
            tLogBox('send', callEndData);
            console.log('send', callEndData);
            signalSocketIo.emit('knowledgetalk', callEndData);
            if (window.roomId) {
                peerCon = new RTCPeerConnection(configuration);
                peerCon.close();
                peerCon = null;
                window.roomId = null;
            }

        } catch (err) {
            if (err instanceof SyntaxError) {
                alert('there was a syntaxError it and try again:' + err.message);
            } else {
                throw err;
            }
        }
    });

    chatBtn.addEventListener('click', function (e) {
        let chatData = {
            signalOp: 'Chat',
            userId: inputId.value,
            message: message.value
        }

        try {
            tLogBox('send', chatData);
            console.log('send', chatData);
            chatTextBox( chatData.userId + ' : ' + chatData.message)
            signalSocketIo.emit('knowledgetalk', chatData);
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert(' there was a syntaxError it and try again : ' + err.message);
            } else {
                throw err;
            }
        }
    });

    signalSocketIo.on('knowledgetalk', function (data) {
        tLogBox('receive', data);
        console.log('receive', data);

        if (!data.eventOp && !data.signalOp) {
            tLogBox('error', 'eventOp undefined');
            console.log('error', 'eventOp undefined');
        }

        //로그인시 처리 이벤트
        if (data.eventOp === 'Login' && data.code === '200') {
            loginBtn.disabled = true;
            tTextbox('로그인 되었습니다.');
        } 
        if (data.eventOp === 'Login' && data.code !== '200') {
            tTextbox('아이디 비밀번호를 다시 확인해 주세요')
        }

        if (data.eventOp === 'Invite') {
            roomId = data.roomId;
            joinBtn.disabled = false;
            tTextbox(data.userId+'님이 통화를 요청합니다.')
        }

        if (data.eventOp === 'Join' && data.code === '200') {
            message.disabled = false;
            chatBtn.disabled = false;
            joinBtn.disabled = true;
            exitBtn.disabled = false;
            tTextbox('통화가 연결되었습니다. 자유롭게 채팅을 이용하세요.');
        }
        if (data.eventOp === 'Join' && data.code !== '200') {
            tTextbox('알 수 없는 에러가 발생하였습니다 관리자에게 문의주세요.');
        }

        if (data.signalOp === 'Chat') {
            chatTextBox( data.userId + ' : ' + data.message)
        }

        //방장이 나갔을때 이벤트
        if (data.signalOp ==='Presence' && data.action ==='end'){
            message.disabled = true;
            chatBtn.disabled = true;
            loginBtn.disabled = true;
            exitBtn.disabled = true;
            joinBtn.disabled = false;
            tTextbox('상대방이 통화를 종료 하였습니다.')
        }
        //내가 나갔을 때 이벤트
        if (data.eventOp === 'ExitRoom' && data.code ==='200'){
            message.disabled = true;
            chatBtn.disabled = true;
            loginBtn.disabled = true;
            exitBtn.disabled = true;
            joinBtn.disabled = true;
            tTextbox('통화를 종료 되었습니다.')
        }
    })

})