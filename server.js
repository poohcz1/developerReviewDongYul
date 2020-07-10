// 상수const로 아래를 선언. require는 모듈을 리턴한다. require는 당연히 함수(메소드)이다.
const http = require('http')
// express는 라이브러리 호출.
const express = require('express')
// express메소드호출(?)
const app = require('express')();
const path = require('path')
const host = '127.0.0.1';
const port = 5000;

// html파일을 set으로 지정. path는 node.js에서 메소드(위require가 ) dirname디렉토리이름리턴.
app.set('views', path.join(__dirname, '/'))
app.set('view engine', 'html');

app.use(express.static('public'));
 
http.createServer(app).listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`)
});