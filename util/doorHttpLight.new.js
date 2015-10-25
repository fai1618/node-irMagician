/*
光センサで今ライトがついてるかついてないかを判断し、それでon、offを決める

コマンドライン引数として、メールの受信者のアドレス,メール送信者のアドレス,メール送信者のパスワードがいる
example: node yourGmailAddress@gmail.com subitterGmailAddress@gmail.com submitter'sPassword
NOTE:メールは両方ともgmailのみ可
*/

process.on('exit', function () {
  console.log('exit.');
});

var fs = require('fs'),
    color = require('../src/color'),
    IRMagician = require('../irMagician'),
    irMagician = {},
    port = '',

    SerialPort = require('serialport').SerialPort,
    arduino,

    closeCount = 0,
    lightJudge = function(){},//つけるか消すか

    Mailer = require('../src/mailer'),
    mailer,
    mailerPass,

    getPost = require('../src/GetPost'),

    GetDate = require('../src/getDate'),
    getDate = new GetDate();


arduino = new SerialPort('/dev/ttyACM0');
irMagician = new IRMagician('/dev/ttyACM1');//arduinoと同時に繋いだ時

//mailerのユーザー名などが与えられた時
if(process.argv[2] && process.argv[3] && process.argv[4]){
  mailer = new Mailer(process.argv[2], process.argv[3], process.argv[4]);
  mailer.send('Starting doorHttpLight.js');
}else{
  console.log(color.error('mailer is not defined!'));
}


lightJudge = function(){
  var dataName = '';
  if(!lightJudge.closeCount){
    lightJudge.closeCount = 0;
  }
  lightJudge.closeCount++;
  if(lightJudge.closeCount % 2 === 1){
    dataName = '../json/lightOn.json';
  }else{
    dataName = '../json/lightOff.json';
  }
  irMagician.Lplay(dataName, function(){console.log('Lplay end callback');});
};

arduino.on('open', function(){
  console.log(color.info('arduino is opened'));

  arduino.on('data', function(data){
    var re = /{lightSensor: [0-1023]+}/,//正規表現
        jsonData = {};
    data += '';//Object => String

    console.log('<data>' + data + '</data>');
    switch(data){
      case '0\n' :
      case '0' : console.log(color.info('door is closed')); break;
      case '1\n' :
      case '1' :
        console.log(color.info('[' + getDate.getTime()+'] door is opened'));
        if (mailer) { mailer.send('Door is opened.'); }
        lightJudge();
        break;
      case '' : break;
      case ' ' : break;
      default:
        //lightSensorの値だったら
        if(re.test(data)){
          console.log('(arduino) data is lightSensorValue');
          try{
            jsonData = JSON.parse(data);
          }catch(err){
            throw err;
          }
          if(jsonData.lightSensor){
            console.log('light sensor value is ' + jsonData.lightSensor);
          }else{
            console.log(color.error('light sensor value is not defined!'));
          }
        }else{
          console.log(color.error('(arduino data) undefined format'));
        }
    }
  });

  arduino.on('close', function(){
    console.log(color.warning('arduino is closed'));
  });
});
//TODO:メール送信しなくていい時の判定追加
//TODO:扉のセンサいるかいらないかの判定