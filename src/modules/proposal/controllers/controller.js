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
  TextRun,
  UnderlineType,
  AlignmentType,
  HeadingLevel,
  Header,
  Footer,
  PageNumber
} = docx;

const cloudinary = require("../../../config/cloudinary").cloudinary;

const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY || "AKIAID5AG5DL27XFHMPA",
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
    const uuid1 = new Date().getTime();

    const params = {
      Bucket: "test-001-01", // pass your bucket name
      Key: "กผง-001-" + uuid1 + ".doc", // file will be saved as testBucket/contacts.csv
      Body: fs.createReadStream(path),
      ACL: "public-read"
    };
    s3.upload(params, function(s3Err, data) {
      if (s3Err) {
        return res.status(400).send({
          status: 400,
          message: s3Err
        });
      }
      textract.fromFileWithPath(path, { preserveLineBreaks: true }, function(
        error,
        text
      ) {
        if(error){
          return res.status(400).send({
            status: 400,
            message: JSON.stringify(error)
          });
        }
        var topics = text
          .replace("1. ชื่อโครงการ :", ";")
          .replace("2. ผู้รับผิดชอบ :", ";")
          .replace("3. หลักการและเหตุผล", ";")
          .replace("4. วัตถุประสงค์", ";")
          .replace(
            "5. ความสอดคล้อง/ความสัมพันธ์กับนโยบายรัฐบาล แผนแม่บทชาติ ยุทธศาสตร์การจัดสรรงบประมาณ",
            ";"
          )
          .replace(
            "6. ความสอดคล้องกับยุทธศาสตร์ เป้าหมายการให้บริการ กลยุทธ์ของสำนักงานทรัพยากรน้ำแห่งชาติ",
            ";"
          )
          .replace("7. พื้นที่ดำเนินโครงการ", ";")
          .replace("8. กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย", ";")
          .replace("9. ระยะเวลาดำเนินโครงการ", ";")
          .replace(
            "10. แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)",
            ";"
          )
          .replace("11. ผลการดำเนินงานที่ผ่านมา (ถ้ามี)", ";")
          .replace("12. งบประมาณ และแผนการใช้จ่ายงบประมาณ", ";")
          .replace(
            "13. ผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ\n",
            ";"
          )
          .replace("14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)", ";")
          .replace("15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ", ";")
          .replace("16. การติดตามและประเมินผลโครงการ", ";")
          .replace("*****************************************", ";")
          .split(";");
        // console.log(topics);
        var jsondoc = {
          name: topics[1].replace("\n", "").replace("\n", ""),
          startdate: null,
          enddate: null,
          budgetyear: 2563,
          budgetsummary: null,
          budgetinyear: null,
          compcode: "01035",
          deptcode: null,
          plancode: null,
          projectcode: null,
          activitycode: null,
          sourcecode: null,
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
          status: "initial",
          file001Url: data.Location
        };
        // console.log(JSON.stringify(jsondoc));
        res.jsonp({
          status: 200,
          data: jsondoc
        });
      });
    });
  });
};

exports.createFile001AndUpload = async function(req, res, next) {
  console.log(req.body);
  var docxData001 = req.body;
  if (docxData001.file001Url) {
    console.log(docxData001.file001Url);
    next();
  } else {
    const child = [];
    child.push(
      new Paragraph({
        text:
          "ข้อเสนอโครงการที่จะเสนอขอตั้งงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. 2563 สำนักงานทรัพยากรน้ำแห่งชาติ",
        style: "heading-center"
      })
    );
    child.push(
      new Paragraph({
        children: []
      })
    );
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "1. ชื่อโครงการ  :  ",
            bold: true
          }),
          new TextRun({
            text: docxData001.name
          })
        ],
        style: "format-title"
      })
    );
    /** 2. ผู้รับผิดชอบ */
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "2. ผู้รับผิดชอบ  : ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.owner)
      docxData001.owner.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t\t");

        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: txt
                })
              ],
              style: "format-subtitle"
            })
          );
        }
      });

    //3. หลักการและเหตุผล

    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "3. หลักการและเหตุผล",
            bold: true
          })
        ],
        style: "format-title"
      })
    );

    if (docxData001.criteria)
      docxData001.criteria.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t\t");
        console.log(txt);
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //4. วัตถุประสงค์
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "4. วัตถุประสงค์",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.objectives)
      docxData001.objectives.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", " ");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //5. ความสอดคล้อง/ความสัมพันธ์กับนโยบายรัฐบาล แผนแม่บทชาติ ยุทธศาสตร์การจัดสรรงบประมาณ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              "5. ความสอดคล้อง/ความสัมพันธ์กับนโยบายรัฐบาล แผนแม่บทชาติ ยุทธศาสตร์การจัดสรรงบประมาณ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.relatetostrategyoutside)
      docxData001.relatetostrategyoutside.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //6. ความสอดคล้องกับยุทธศาสตร์ เป้าหมายการให้บริการ กลยุทธ์ของสำนักงานทรัพยากรน้ำแห่งชาติ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              "6. ความสอดคล้องกับยุทธศาสตร์ เป้าหมายการให้บริการ กลยุทธ์ของสำนักงานทรัพยากรน้ำแห่งชาติ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );

    if (docxData001.relatetostrategyinside)
      docxData001.relatetostrategyinside.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //7. พื้นที่ดำเนินโครงการ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "7. พื้นที่ดำเนินโครงการ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.location)
      docxData001.location.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //8. กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "8. กลุ่มเป้าหมาย ผู้มีส่วนได้ส่วนเสีย",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.targetgroup)
      docxData001.targetgroup.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //9. ระยะเวลาดำเนินโครงการ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "9. ระยะเวลาดำเนินโครงการ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.timeline)
      docxData001.timeline.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //10. แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "10. แผนการปฏิบัติงาน/วิธีการดำเนินงาน/กิจกรรม (โดยละเอียด)",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.process)
      docxData001.process.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //11. ผลการดำเนินงานที่ผ่านมา (ถ้ามี)
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "11. ผลการดำเนินงานที่ผ่านมา (ถ้ามี)",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.resulthistory)
      docxData001.resulthistory.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //12. งบประมาณ และแผนการใช้จ่ายงบประมาณ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "12. งบประมาณ และแผนการใช้จ่ายงบประมาณ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.budgetpaln)
      docxData001.budgetpaln.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //13.	ผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "13. ผลผลิตของแผนงาน/โครงการ (Output) และตัวชี้วัดของโครงการ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.output)
      docxData001.output.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "14. ผลลัพธ์/ผลสัมฤทธิ์ของแผนงาน/โครงการ (Outcome)",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.outcome)
      docxData001.outcome.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "15. ผลประโยชน์/ผลกระทบที่คาดว่าจะได้รับ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.benefit)
      docxData001.benefit.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    //16. การติดตามและประเมินผลโครงการ
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "16. การติดตามและประเมินผลโครงการ",
            bold: true
          })
        ],
        style: "format-title"
      })
    );
    if (docxData001.indicator)
      docxData001.indicator.split("<p>").forEach(function(owner) {
        var txt = owner
          .replace("\t\t\t", "*")
          .replace("\t\t", "*")
          .replace("\t", "*")
          .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
          .replace("</p>", "")
          .replace("*", "\t");
        if (txt !== "") {
          child.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: (txt.startsWith("\t") ? "" : "\t") + txt
                })
              ],
              style: "format-subtitle-normal"
            })
          );
        }
      });

    child.push(
      new Paragraph({
        children: []
      })
    );
    //*****************************************
    child.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "*****************************************",
            bold: true
          })
        ],
        style: "format-title-center"
      })
    );

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "heading-end",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              bold: true,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.END
            }
          },
          {
            id: "heading-center",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              bold: true,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.CENTER
            }
          },
          {
            id: "format-title",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.START
            }
          },
          {
            id: "format-title-center",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.CENTER
            }
          },
          {
            id: "format-subtitle",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.START,
              indent: {
                left: 900
              }
            }
          },
          {
            id: "format-subtitle-normal",
            basedOn: "Normal",
            next: "Normal",
            run: {
              size: 32,
              font: "TH SarabunPSK"
            },
            paragraph: {
              alignment: AlignmentType.START
              // spacing: { line: 76 }
            }
          }
        ]
      }
    });

    doc.addSection({
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              text: "แบบฟอร์ม กผง.001",
              style: "heading-end"
            })
          ]
        }),
        first: new Header({
          // The first header
          children: [
            new Paragraph({
              text: "แบบฟอร์ม กผง.001",
              style: "heading-end"
            })
          ]
        }),
        even: new Header({
          // The header on every other page
          children: [
            new Paragraph({
              text: PageNumber.CURRENT,
              style: "heading-center"
            })
          ]
        })
      },
      children: child
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
  }
};

exports.createFile003AndUpload = async function(req, res, next) {
  // console.log(req.body);
  var docxData003 = req.body;
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "heading-end",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            bold: true,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.END
          }
        },
        {
          id: "heading-center",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            bold: true,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.CENTER
          }
        },
        {
          id: "format-title",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.START
          }
        },
        {
          id: "format-title-center",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.CENTER
          }
        },
        {
          id: "format-title-end",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.END
          }
        },
        {
          id: "format-subtitle",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.START,
            indent: {
              left: 900
            }
          }
        },
        {
          id: "format-subtitle-normal",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 32,
            font: "TH SarabunPSK"
          },
          paragraph: {
            alignment: AlignmentType.START
            // spacing: { line: 76 }
          }
        }
      ]
    }
  });

  const child = [];
  child.push(
    new Paragraph({
      text: "แบบประมาณการ",
      style: "heading-center"
    })
  );

  child.push(
    new Paragraph({
      children: []
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "หน่วยงาน  ",
          bold: true
        }),
        new TextRun({
          text: "ชื่อหน่วยงาน"
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "กลุ่ม/ฝ่าย  ",
          bold: true
        }),
        new TextRun({
          text: "ชื่อกลุ่ม/ฝ่าย"
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "รายการ  ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.name}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "แผนงาน  ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.planname}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ผลผลิต/โครงการ ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.projectname}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "กิจกรรม ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.activityname}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ประเภทรายจ่าย ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.sourcename}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "รวมเงิน ",
          bold: true
        }),
        new TextRun({
          text: `${docxData003.budgetsummary}`
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "-------------------------------------------------------------------------------",
          bold: true
        })
      ],
      style: "format-title-center"
    })
  );

  child.push(
    new Paragraph({
      text: "คำชี้แจง",
      style: "heading-center"
    })
  );

  //เรียน ลทช. ผ่าน ผอ.ศอน.
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `เรียน ลทช. ผ่าน ผอ.ศอน.`
        })
      ],
      style: "format-title"
    })
  );

  //ประมาณการฉบับนี้ตั้งขึ้นเพื่อควบคุมค่าใช้จ่ายใน โครงการโครงการจัดทำผังน้ำ ลุ่มน้ำชี
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `\tประมาณการฉบับนี้ตั้งขึ้นเพื่อควบคุมค่าใช้จ่ายใน${docxData003.name} `
        })
      ],
      style: "format-title"
    })
  );
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `วัตถุประสงค์`
          // bold: true
        })
      ],
      style: "format-title"
    })
  );

  if (docxData003.objectives)
    docxData003.objectives.split("<p>").forEach(function(owner) {
      var txt = owner
        .replace("\t\t\t", "*")
        .replace("\t\t", "*")
        .replace("\t", "*")
        .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
        .replace("</p>", "")
        .replace("*", "\t\t");
      console.log(txt);
      if (txt !== "") {
        child.push(
          new Paragraph({
            children: [
              new TextRun({
                text: (txt.startsWith("\t") ? "" : "\t") + txt
              })
            ],
            style: "format-subtitle-normal"
          })
        );
      }
    });

  child.push(
    new Paragraph({
      children: []
    })
  );
  //ดังนั้น เพื่อให้การดำเนินงานบรรลุตามวัตุประสงค์ที่วางไว้ จึงขอ ทั้งสิ้น 5000000 ตามรายละเอียด
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "\tดังนั้น เพื่อให้การดำเนินงานบรรลุตามวัตุประสงค์ที่วางไว้ จึงขออนุมัติใช้งบประมาณเป็นเงิน"
        })
      ],
      style: "format-title"
    })
  );

  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `ทั้งสิ้น ${docxData003.budgetinyear} บาท(....................ตัวอักษร....................) เพื่อดำเนินงานในปี ${docxData003.budgetyear}`
        })
      ],
      style: "format-title"
    })
  );

  //ตามรายละเอียดแนบท้ายนี้
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ตามรายละเอียดแนบท้ายนี้"
        })
      ],
      style: "format-title"
    })
  );

  //จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "\tจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ"
        })
      ],
      style: "format-title"
    })
  );
  child.push(
    new Paragraph({
      children: []
    })
  );
  child.push(
    new Paragraph({
      children: []
    })
  );
  //(ชื่อ-สกุล....(ผู้จัดทำประมาณการ)......)
  // child.push(
  //   new Paragraph({
  //     children: [
  //       new TextRun({
  //         text: "(ชื่อ-สกุล....(ผู้จัดทำประมาณการ)......)"
  //       })
  //     ],
  //     style: "format-title-end"
  //   })
  // );
  if (docxData003.owner)
    docxData003.owner.split("<p>").forEach(function(owner) {
      var txt = owner
        .replace("\t\t\t", "*")
        .replace("\t\t", "*")
        .replace("\t", "*")
        .replace("&nbsp;&nbsp;&nbsp;&nbsp;", "\t")
        .replace(" &nbsp;", "")
        .replace("</p>", "")
        .replace("*", "\t\t");
      console.log(txt);
      if (txt !== "") {
        child.push(
          new Paragraph({
            children: [
              new TextRun({
                text: txt
              })
            ],
            style: "format-title-end"
          })
        );
      }
    });

  child.push(
    new Paragraph({
      children: []
    })
  );
  child.push(
    new Paragraph({
      children: []
    })
  );
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "\t\tผ่าน\t\t\t\t\t\tอนุมัติ"
        })
      ],
      style: "format-title"
    })
  );
  child.push(
    new Paragraph({
      children: []
    })
  );
  child.push(
    new Paragraph({
      children: []
    })
  );
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "(ชื่อ-สกุล.....(ผู้บังคับบัญชา)........)\t\t\t\t(นายสมเกียรติ ประจำวงค์)"
        })
      ],
      style: "format-title"
    })
  );

  //ตำแหน่ง........................
  child.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "ตำแหน่ง........................\t\t\t\t\t\tลทช"
        })
      ],
      style: "format-title"
    })
  );
  doc.addSection({
    children: child
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
