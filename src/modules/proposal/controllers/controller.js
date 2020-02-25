"use strict";
var mongoose = require("mongoose"),
  model = require("../models/model"),
  mq = require("../../core/controllers/rabbitmq"),
  Proposal = mongoose.model("Proposal"),
  errorHandler = require("../../core/controllers/errors.server.controller"),
  _ = require("lodash");
const multer = require("multer");

const uuid = require("uuid");

const fs = require("fs");
const docx = require("docx");

const {
  Document,
  Packer,
  Paragraph,
  Header,
  TextRun,
  HeadingLevel,
  VerticalAlign,
  Media
} = docx;

const cloudinary = require("../../../config/cloudinary").cloudinary;

const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY || "AKIAJFWOFVYYQBMWVRUA",
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY ||
    "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"
});

const WordExtractor = require("word-extractor");
var textract = require("textract");

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
  Proposal.find({}, {}, query, function(err, datas) {
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
  var newProposal = new Proposal(req.body);
  newProposal.createby = req.user;
  newProposal.save(function(err, data) {
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

  Proposal.findById(id, function(err, data) {
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
  var updProposal = _.extend(req.data, req.body);
  updProposal.updated = new Date();
  updProposal.updateby = req.user;
  updProposal.save(function(err, data) {
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
    // console.log(req.file);
    const path = req.file.path;

    textract.fromFileWithPath(path, { preserveLineBreaks: true }, function(
      error,
      text
    ) {
      console.log(text);
      var topics = text
        .replace("1. ชื่อโครงการ : ", ";")
        .replace("2. ผู้รับผิดชอบ : \n", ";")
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
          "13. ผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ\n",
          ";"
        )
        .replace("14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)\n", ";")
        .replace("15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ\n", ";")
        .replace("16. การติดตามและประเมินผลโครงการ\n", ";")
        .replace("*****************************************\n", ";")
        .split(";");
      // console.log(topics);
      var jsondoc = {
        name: topics[1].replace("\n", "").replace("\n", ""),
        startdate: null,
        enddate: null,
        budgetyear: null,
        budgetsummary: null,
        budgetinyear: null,
        compcode: "01035",
        deptcode: "01035",
        plancode: "00",
        projectcode: "00000",
        activitycode: "0000000",
        sourcecode: "00",
        owner: convertToHtml(topics[2]),
        criteria: convertToHtml(topics[3]),
        objectives: convertToHtml(topics[4]),
        relatetostrategyoutside: convertToHtml(topics[5]),
        relatetostrategyinside: convertToHtml(topics[6]),
        location: convertToHtml(topics[7]),
        targetgroup: convertToHtml(topics[8]),
        timeline: convertToHtml(topics[9]),
        process: convertToHtml(topics[10]),
        resulthistory: convertToHtml(topics[11]),
        budgetpaln: "รายละเอียดแผนการใช้จ่ายงบประมาณตามแบบฟอร์ม กผง.002", //convertToHtml(topics[12]),
        output: convertToHtml(topics[13]),
        outcome: convertToHtml(topics[14]),
        benefit: convertToHtml(topics[15]),
        indicator: convertToHtml(topics[16]),
        status: "initial"
      };
      // console.log(JSON.stringify(jsondoc));
      res.jsonp({
        status: 200,
        data: jsondoc
      });
    });
    // var extractor = new WordExtractor();
    // var extracted = extractor.extract(path);
    // extracted.then(function(doc) {
    //   var body = doc.getBody();
    //   var topics = body
    //     .replace("1. ชื่อโครงการ  : ", ";")
    //     .replace("2. ผู้รับผิดชอบ  : \n", ";")
    //     .replace("3. หลักการและเหตุผล \n", ";")
    //     .replace("4. วัตถุประสงค์\n", ";")
    //     .replace(
    //       "5. ความสอดคล้อง/ความสัมพันธ์กับนโยบายรัฐบาล แผนแม่บทชาติ ยุทธศาสตร์การจัดสรรงบประมาณ\n",
    //       ";"
    //     )
    //     .replace(
    //       "6. ความสอดคล้องกับยุทธศาสตร์ เป้าหมายการให้บริการ กลยุทธ์ของสำนักงานทรัพยากรน้ำแห่งชาติ\n",
    //       ";"
    //     )
    //     .replace("7. พื้นที่ดำเนินโครงการ\n", ";")
    //     .replace("8. กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย\n", ";")
    //     .replace("9. ระยะเวลาดำเนินโครงการ\n", ";")
    //     .replace(
    //       "10. แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)\n",
    //       ";"
    //     )
    //     .replace("11. ผลการดำเนินงานที่ผ่านมา (ถ้ามี)\n", ";")
    //     .replace("12. งบประมาณ และแผนการใช้จ่ายงบประมาณ \n", ";")
    //     .replace(
    //       "13.\tผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ\n",
    //       ";"
    //     )
    //     .replace("14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)\n", ";")
    //     .replace("15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ\n", ";")
    //     .replace("16. การติดตามและประเมินผลโครงการ\n", ";")
    //     .replace("*****************************************\n", ";")
    //     .split(";");

    //   // console.log(topics);
    //   var jsondoc = {
    //     name: topics[1].replace("\n", "").replace("\n", ""),
    //     startdate: null,
    //     enddate: null,
    //     budgetyear: null,
    //     budgetsummary: null,
    //     budgetinyear: null,
    //     compcode: "01035",
    //     deptcode: "01035",
    //     plancode: "00",
    //     projectcode: "00000",
    //     activitycode: "0000000",
    //     sourcecode: "00",
    //     owner: convertToHtml(topics[2]),
    //     criteria: convertToHtml(topics[3]),
    //     objectives: convertToHtml(topics[4]),
    //     relatetostrategyoutside: convertToHtml(topics[5]),
    //     relatetostrategyinside: convertToHtml(topics[6]),
    //     location: convertToHtml(topics[7]),
    //     targetgroup: convertToHtml(topics[8]),
    //     timeline: convertToHtml(topics[9]),
    //     process: convertToHtml(topics[10]),
    //     resulthistory: convertToHtml(topics[11]),
    //     budgetpaln: "รายละเอียดแผนการใช้จ่ายงบประมาณตามแบบฟอร์ม กผง.002", //convertToHtml(topics[12]),
    //     output: convertToHtml(topics[13]),
    //     outcome: convertToHtml(topics[14]),
    //     benefit: convertToHtml(topics[15]),
    //     indicator: convertToHtml(topics[16]),
    //     status: "initial"
    //   };
    //   //   console.log(JSON.stringify(jsondoc));
    //   res.jsonp({
    //     status: 200,
    //     data: jsondoc
    //   });
    // });
  });
};

exports.createFile001AndUpload = async function(req, res, next) {
  // console.log(req.body);
  var docxData001 = req.body;
  const doc = new Document();
  // if (payload.file001Url) next();
  doc.addSection({
    headers: {
      default: new Header({
        children: [
          new Paragraph(
            "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t          แบบฟอร์ม กผง.001"
          )
        ]
      })
    },

    children: [
      new Paragraph({
        children: [
          new TextRun({
            text:
              "\t\t ข้อเสนอโครงการที่จะเสนอขอตั้งงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. 2563 สำนักงานทรัพยากรน้ำแห่งชาติ \n",
            heading: HeadingLevel.HEADING_2,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "1. ชื่อโครงการ : ",
            bold: true
          }),
          new TextRun({
            text: docxData001.name
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผู้รับผิดชอบ :\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.owner
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "หลักการและเหตุผล\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.criteria
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "วัตถุประสงค์\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.objectives
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "พื้นที่ดำเนินโครงการ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.location
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.targetgroup
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ระยะเวลาดำเนินโครงการ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.timeline
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.process
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผลการดำเนินงานที่ผ่านมา (ถ้ามี)\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.resulthistory
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "งบประมาณ และแผนการใช้จ่ายงบประมาณ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.budgetpaln
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.output
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.outcome
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.benefit
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "การติดตามและประเมินผลโครงการ\t",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: docxData001.indicator
          })
        ]
      })
    ]
  });

  const documentBuffer = await Packer.toBase64String(doc);
  let buff = new Buffer(documentBuffer, "base64");
  // var date1 = Date.now();
  var uuid1 = new Date().getTime();

  const params = {
    Bucket: "test-001-01", // pass your bucket name
    Key: "กผง-001-" + uuid1 + ".doc", // file will be saved as testBucket/contacts.csv
    Body: buff,
    ACL: "public-read"
  };
  s3.upload(params, function(s3Err, data) {
    if (s3Err) throw s3Err;
    req.body.file001Url = data.Location;

    next();
  });
};
exports.createFile003AndUpload = async function(req, res, next) {
  // console.log(req.body);
  var docxData003 = req.body;
  const doc = new Document();
  doc.addSection({
    // properties: {},
    headers: {
      default: new Header({
        children: [
          // new Paragraph(image1),
          new Paragraph({
            children: [
              new TextRun({
                text: "\t\t\t\t\t\tแบบประมาณการ",
                bold: true
              })
            ]
          })
        ]
      })
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "หน่วยงาน\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.deptname,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "กลุ่ม/ฝ่าย\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.groupname,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "รายการ\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.name,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "แผนงาน\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.planname,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ผลผลิต/โครงการ โครงการที่ 1\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.projectname,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "กิจกรรม กิจกรรมที่ 1.1\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.activityname,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "ประเภทรายจ่าย\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.sourcename,
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "รวมเงิน\t",
            bold: true
          }),
          new TextRun({
            text: docxData003.budgetsummary,
            bold: true
          })
        ]
      }),
      // new Paragraph({
      //   children: [new TextRun(docxData003.budgetsummarytext)]
      // }),
      new Paragraph({
        children: [
          new TextRun(
            "\t\t\t--------------------------------------------------------------"
          )
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "\t\t\t\t\t\tคำชี้แจง",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [new TextRun("เรียน ลทช. ผ่าน ผอ.ศอน.")]
      }),
      new Paragraph({
        children: [
          // new TextRun("\tประมาณการฉบับนี้ตั้งขึ้นเพื่อควบคุมค่าใช้จ่ายในโครงการขับเคลื่อนนโยบาย และแผนแม่บทด้านการบริหารจัดการน้ำ"),
          new TextRun({
            text: "\tประมาณการฉบับนี้ตั้งขึ้นเพื่อควบคุมค่าใช้จ่ายใน โครงการ"
          }),
          new TextRun({
            text: docxData003.name
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun(
            "\tตามพระราชบัญญัติทรัพยากรน้ำ พ.ศ. 2561 กำหนดให้สำนักงานมีการจัดทำ 'ผังน้ำ' เพื่อเสนอให้กับคณะกรรมการทรัพยากรน้ำแห่งชาติ ภายในวันดังกล่าว"
          )
        ]
      }),
      new Paragraph({
        children: [
          // new TextRun("\tดังนั้น เพื่อให้การดำเนินงานบรรลุตามวัตุประสงค์ที่วางไว้ จึงขอ ทั้งสิ้น 55,278,300 บาท ( ห้าสิบห้าล้านสองแสนเจ็ดหมื่นแปดพันสามร้อยบาทถ้วน ) ตามรายละเอียด"),
          new TextRun({
            text:
              "\tดังนั้น เพื่อให้การดำเนินงานบรรลุตามวัตุประสงค์ที่วางไว้ จึงขอ ทั้งสิ้น "
          }),
          new TextRun({
            text: docxData003.budgetsummary
          }),
          new TextRun({
            text: docxData003.budgetsummarytext
          }),
          new TextRun({
            text: "\tตามรายละเอียด"
          })
        ]
      }),
      new Paragraph({
        children: [new TextRun("\t\t\tจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ")]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [new TextRun(docxData003.owner)]
      }),
      new Paragraph({
        children: [
          new TextRun(
            "\t\t\t\t\t\t\t\t\tผู้อำนวยการกลุ่มวิเคราะห์และติดตามสถาน"
          )
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "\t\t\t  ผ่าน",
            bold: true
          }),
          new TextRun({
            text: "\t\t\t\t\t   อนุมัติ",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: []
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "\t\t      (นาย อุทัย เตียนพลกรัง)",
            bold: true
          }),
          new TextRun({
            text: "\t\t\t      (นาย สมเกียรติ ประจำวงษ์)",
            bold: true
          })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "\t\tผู้อำนวยการศูนย์อำนวยการน้ำแห่งชาติ",
            bold: true
          }),
          new TextRun({
            text: "\t\t\tเลขาธิการสำนักงานทรัพยากรน้ำแห่งชาติ",
            bold: true
          })
        ]
      })
    ]
  });
  const documentBuffer = await Packer.toBase64String(doc);
  let buff = new Buffer(documentBuffer, "base64");
  // var date1 = Date.now();
  var uuid1 = new Date().getTime();

  const params = {
    Bucket: "test-001-01", // pass your bucket name
    Key: "กผง-003-" + uuid1 + ".doc", // file will be saved as testBucket/contacts.csv
    Body: buff,
    ACL: "public-read"
  };
  s3.upload(params, function(s3Err, data) {
    if (s3Err) throw s3Err;
    req.body.file003Url = data.Location;

    next();
  });
};
exports.createFile002AndUpload = async function(req, res, next) {
  // console.log(req.body);
  var payload = req.body;

  next();
};

function convertToHtml(richText) {
  var result = "";
  if (!richText) return result;
  richText.split("\n").forEach(line => {
    result += `<p>${line.replace("\t", "&nbsp;&nbsp;&nbsp;&nbsp;")}</p>`;
  });
  return result;
}

function convertToRichText(richText) {
  var result = "";
  if (!richText) return result;
  richText.split("<p>").forEach(line => {
    result += `\n${line
      .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
      .replace("</p>", "")}`;
  });
  return result;
}
