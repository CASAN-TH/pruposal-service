"use strict";
var mongoose = require("mongoose"),
  model = require("../models/model"),
  mq = require("../../core/controllers/rabbitmq"),
  Pruposal = mongoose.model("Pruposal"),
  errorHandler = require("../../core/controllers/errors.server.controller"),
  _ = require("lodash");

const multer = require("multer");

const WordExtractor = require("word-extractor");

const storage = multer.diskStorage({
  filename: function(req, file, cb) {
    // console.log(file);
    cb(null, file.originalname);
  }
});

exports.getList = function(req, res) {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(req.query.size);
  var query = {};
  if (pageNo < 0 || pageNo === 0) {
    response = {
      error: true,
      message: "invalid page number, should start with 1"
    };
    return res.json(response);
  }
  query.skip = size * (pageNo - 1);
  query.limit = size;
  Pruposal.find({}, {}, query, function(err, datas) {
    if (err) {
      return res.status(400).send({
        status: 400,
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp({
        status: 200,
        data: datas
      });
    }
  });
};

exports.create = function(req, res) {
  var newPruposal = new Pruposal(req.body);
  newPruposal.createby = req.user;
  newPruposal.save(function(err, data) {
    if (err) {
      return res.status(400).send({
        status: 400,
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp({
        status: 200,
        data: data
      });
      /**
       * Message Queue
       */
      // mq.publish('exchange', 'keymsg', JSON.stringify(newOrder));
    }
  });
};

exports.getByID = function(req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      status: 400,
      message: "Id is invalid"
    });
  }

  Pruposal.findById(id, function(err, data) {
    if (err) {
      return res.status(400).send({
        status: 400,
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      req.data = data ? data : {};
      next();
    }
  });
};

exports.read = function(req, res) {
  res.jsonp({
    status: 200,
    data: req.data ? req.data : []
  });
};

exports.update = function(req, res) {
  var updPruposal = _.extend(req.data, req.body);
  updPruposal.updated = new Date();
  updPruposal.updateby = req.user;
  updPruposal.save(function(err, data) {
    if (err) {
      return res.status(400).send({
        status: 400,
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp({
        status: 200,
        data: data
      });
    }
  });
};

exports.delete = function(req, res) {
  req.data.remove(function(err, data) {
    if (err) {
      return res.status(400).send({
        status: 400,
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.jsonp({
        status: 200,
        data: data
      });
    }
  });
};

exports.upload = function(req, res) {
  const upload = multer({ storage }).single("file");
  upload(req, res, function(err) {
    if (err) {
      return res.send(err);
    }
    const path = req.file.path;
    // console.log(path);
    var extractor = new WordExtractor();
    var extracted = extractor.extract(path);
    extracted.then(function(doc) {
      var body = doc.getBody();
      var topics = body
        .replace("1. ชื่อโครงการ  : ", ";")
        .replace("2. ผู้รับผิดชอบ  : \n", ";")
        .replace("3. หลักการและเหตุผล \n", ";")
        .replace("4. วัตถุประสงค์\n", ";")
        .replace(
          "5. ความสอดคล้อง/ความสัมพันธ์กับนโยบายรัฐบาล แผนแม่บทชาติ ยุทธศาสตร์การจัดสรรงบประมาณ\n",
          ";"
        )
        .replace(
          "6. ความสอดคล้องกับยุทธศาสตร์ เป้าหมายการให้บริการ กลยุทธ์ของสำนักงานทรัพยากรน้ำแห่งชาติ\n",
          ";"
        )
        .replace("7. พื้นที่ดำเนินโครงการ\n", ";")
        .replace("8. กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย\n", ";")
        .replace("9. ระยะเวลาดำเนินโครงการ\n", ";")
        .replace(
          "10. แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)\n",
          ";"
        )
        .replace("11. ผลการดำเนินงานที่ผ่านมา (ถ้ามี)\n", ";")
        .replace("12. งบประมาณ และแผนการใช้จ่ายงบประมาณ \n", ";")
        .replace(
          "13.\tผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ\n",
          ";"
        )
        .replace("14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)\n", ";")
        .replace("15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ\n", ";")
        .replace("16. การติดตามและประเมินผลโครงการ\n", ";")
        .replace("*****************************************\n", ";")
        .split(";");
      var jsondoc = {
        name: topics[1].replace("\n", "").replace("\n", ""),
        plancode: "00",
        projectcode: "00000",
        activitycode: "0000000",
        sourcecode: "00",
        owner: topics[2],
        criteria: topics[3],
        objectives: topics[4],
        relatetostrategyoutside: topics[5],
        relatetostrategyinside: topics[6],
        location: topics[7],
        targetgroup: topics[8],
        timeline: topics[9],
        process: topics[10],
        resulthistory: topics[11],
        budgetpaln: topics[12].toString(),
        output: topics[13],
        outcome: topics[14],
        benefit: topics[15],
        indicator: topics[16],
        status: "draf"
      };
    //   console.log(JSON.stringify(jsondoc));
      res.jsonp({
        status: 200,
        data: jsondoc
      });
    });
  });
};
