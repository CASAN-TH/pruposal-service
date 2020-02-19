"use strict";
var request = require("supertest"),
  assert = require("assert"),
  config = require("../../../config/config"),
  _ = require("lodash"),
  jwt = require("jsonwebtoken"),
  mongoose = require("mongoose"),
  app = require("../../../config/express"),
  Pruposal = mongoose.model("Pruposal");

var credentials, token, mockup;

describe("Pruposal CRUD routes tests", function() {
  before(function(done) {
    mockup = {
      name: "โครงการจัดทำผังน้ำ ลุ่มน้ำชี",
      plancode: "00",
      projectcode: "00000",
      activitycode: "0000000",
      sourcecode: "00",
      owner:
        "ชื่อ-นามสกุล\tนายอุทัย เตียนพลกรัง\nตำแหน่ง\t\tผู้อำนวยการศูนย์อำนวยการน้ำแห่งชาติ\nสังกัด\tสำนักงานทรัพยากรน้ำแห่งชาติ\nโทรศัพท์เคลื่อนที่\t0-2521-9141\nE-mail address\tnwcc.onwr@gmail.com\n\n",
      criteria:
        'ตามพระราชบัญญัติทรัพยากรน้ำ พ.ศ. 2561\nมาตรา 2 พระราชบัญญัตินี้ให้ใช้บังคับเมื่อพ้นกำหนดสามสิบวันนับแต่วันประกาศในราชกิจจานุเบกษาเป็นต้นไป เว้นแต่บทบัญญัติ ในหมวดที่ 4 การจัดสรรน้ำและการใช้น้ำ และมาตรา 104 ให้ใช้บังคับเมื่อพ้นสองปี นับตั้งแต่วันที่พระราชบัญญัตินี้ใช้บังคับเป็นต้นไป\n\nมาตรา 4 ในพระราชบัญญัตินี้\n"ผังน้ำ" หมายความว่า แผนที่หรือแผนผังแสดงระบบทางน้ำที่ไหลผ่าน ซึ่งเชื่อมโยงกันตั้งแต่ต้นน้ำจนถึงทางออกสู่พื้นที่แหล่งน้ำ ทะเล หรือทางออกทางน้ำระหว่างประเทศ ซึ่งระบบทางน้ำดังกล่าวครอบคลุมทั้งแม่น้ำ ลำคลอง ห้วย หนอง บึง กุด ป่าบุ่ง ป่าทาม พื้นที่ชุ่มน้ำ พื้นที่แหล่งกักเก็บน้ำ พื้นที่ทางน้ำหลาก พื้นที่น้ำนอง พื้นที่ลุ่มต่ำ ทางน้ำหรือพื้นที่อื่นใดที่มีลักษณะทำนองเดียวกันไม่ว่าจะเกิดขึ้นตามธรรมชาติหรือมนุษย์สร้างขึ้น โดยทางน้ำดังกล่าวอาจมีน้ำไหลผ่านตลอดทั้งปีหรือบางช่วงเวลาก็ได้\n"สำนักงาน" หมายความว่า สำนักงานทรัพยากรน้ำแห่งชาติ\n\nมาตรา 17 กนช. มีหน้าที่และอำนาจเกี่ยวกับการบริหารจัดการทรัพยากรน้ำเพื่อให้บรรลุวัตถุประสงค์ในการบูรณาการเกี่ยวกับการใช้ การพัฒนา การบริหารจัดการ การบำรุงรักษา การฟื้นฟู และการอนุรักษ์ทรัพยากรน้ำให้เกิดความเป็นเอกภาพ\n(5) พิจารณาและให้ความเห็นชอบผังน้ำที่สำนักงานเสนอ และประกาศกำหนดผังน้ำในราชกิจจานุเบกษา\n\nมาตรา 23 ให้สำนักงานทำหน้าที่เป็นสำนักงานเลขานุการของ กนช. โดยให้มีหน้าที่และอำนาจดังต่อไปนี้\n(2) กลั่นกรองและเสนอความเห็นต่อ กนช. เพื่อประกอบการพิจารณาดำเนินการตามมาตรา 17 (1) (2) (3) และมาตรา 24\n(3) จัดทำผังน้ำเสนอ กนช. เพื่อพิจารณาให้ความเห็นชอบตามมาตรา 17 (5) การจัดทำผังน้ำตาม (3) ต้องจัดให้มีรายการประกอบผังน้ำเพื่ออธิบายวัตถุประสงค์ของผังน้ำ และรายละเอียดที่ปรากฏอยู่ในผังน้ำ ทั้งนี้ การจัดทำผังน้ำต้องจัดให้มีการรับฟังความคิดเห็นของคณะกรรมการลุ่มน้ำ หน่วยงานของรัฐ องค์กรปกครองส่วนท้องถิ่น และประชาชนที่เกี่ยวข้องตามความเหมาะสม\n\nมาตรา 56 เมื่อมีการประกาศผังน้ำในราชกิจจานุเบกษาตามมาตรา 17 (5) แล้วการใช้ประโยชน์ที่ดินที่อยู่ในระบบทางน้ำตามผังน้ำจะต้องไม่ก่อให้เกิดการเบี่ยงเบนทางน้ำหรือกระแสน้ำ หรือสิ่งกีดขวางการไหลของน้ำ ในระบบทางน้ำ อันเป็นอุปสรรคต่อการปฏิบัติตามแผนป้องกันและแก้ไขภาวะน้ำแล้ง และแผนป้องกันและแก้ไขภาวะน้ำท่วม\n\nมาตรา 103 ในวาระเริ่มแรก ให้สำนักงานจัดทำผังน้ำและรายการประกอบผังน้ำเสนอ เพื่อพิจารณาภายในสองปีนับแต่วันที่พระราชบัญญัตินี้ใช้บังคับ\n\nสรุป พรบ.ทรัพยากรน้ำ พ.ศ.2561 มีผลบังคับใช้ดังนี้\n\t1. พรบ.ทรัพยากรน้ำ พ.ศ.2561 มีผลบังคับใช้นับแต่ 27 มกราคม 2562 (ตามมาตรา 2)\n\t2. ใช้ความหมาย "ผังน้ำ" "สำนักงาน" (ตามมาตรา 4)\n\t3. กนช. พิจารณาและให้ความเห็นชอบผังน้ำที่ สทนช. เสนอ และประกาศกำหนดผังน้ำในราชกิจจานุเบกษา (มาตรา 17 (5))\n\t4. สทนช. ทำหน้าที่เป็นฝ่ายเลขานุการของ กนช. มีหน้าที่และอำนาจกลั่นกรอง และเสนอความเห็นชอบต่อ กนช. ในการจัดทำผังน้ำเพื่อพิจารณาให้ความเห็นชอบ (ตามมาตรา 23 (2)(3)) และวรรคสุดท้าย)\n\t5. การใช้ประโยชน์ที่ดินในระบบทางน้ำตามผังน้ำ ต้องเป็นไปตาม มาตรา 56\n\t6. สทนช. จัดทำผังน้ำ และรายการประกอบ เสนอ กนช. ภายในวันที่ 26 มกราคม 2564 (มาตรา 103)\n\n',
      objectives: "เพื่อจัดทำแผนที่ผังน้ำ\n\n",
      relatetostrategyoutside:
        "สอดคล้องนโยบายด้านการจัดการน้ำและสร้างความเติบโตบนคุณภาพชีวิตที่เป็นมิตรกับสิ่งแวดล้อมอย่างยั่งยืน และแผนยุทธศาสตร์การบริหารจัดการน้ำ พ.ศ.2558-2569 และกฏหมายว่าด้วยทรัพยากรน้ำ\n\n",
      relatetostrategyinside:
        "แผนยุทธศาสตร์การบริหารจัดการน้ำ พ.ศ. 2558-2569 และกฏหมายว่าด้วยทรัพยากรน้ำ\n\n",
      location: "พื้นที่ลุ่มน้ำชี\n\n",
      targetgroup:
        "คณะกรรมการลุ่มน้ำ หน่วยราชการที่เกี่ยวข้องด้านน้ำ ประชาชนในพื้นที่\n\n",
      timeline: "450 วัน\n\n\n",
      process:
        "1. ศึกษาการจัดทำผังน้ำตาม พรบ.ทรัพยากรน้ำ พ.ศ.2561 และกฏหมาย กฏกระทรวง ระเบียบและประกาศอื่นๆ ที่เกี่ยวข้อง\n2. ศึกษากำหนดหลักเกณฑ์ วิธีวิเคราะห์ และเงื่อนไขประกอบการวิเคราะห์ต่างๆ อย่างเป็นระบบ\n3. ศึกษากำหนดรูปแบบ แนวทาง และขั้นตอน การจัดทำผังน้ำ ให้มีระเบียบแบบแผนที่ชัดเจน นำไปปฏิบัติได้\n4. จัดทำแผนที่ผังน้ำแสดงรายละเอียดต่างๆ ประกอบ\n\n",
      resulthistory: "-\n\n",
      budgetpaln:
        "- วงเงินงบประมาณทั้งโครงการ\tจำนวน\t55,278,300 บาท \n- วงเงินงบประมาณที่ขอในปี 2563\tจำนวน\t13,819,600 บาท\n- ระบุรายละเอียดแผนการใช้จ่ายงบประมาณตามแบบฟอร์ม กผง.002\n\n",
      output: "ได้แผนที่ผังน้ำ ตามเงื่อนไข พรบ.ทรัพยากรน้ำ พ.ศ.2561\n\n",
      outcome:
        "ใช้แผนที่ผังน้ำปประกอบการวางแผนบริหารจัดการทรัพยากรน้ำอย่างมีประสิทธิภาพและประสิทธิผล และประกอบการวางผังเมือง\n\n",
      benefit: "1. กรรมการกำกับดูแลทางด้านวิชาการ\n2. กรรมการตรวจรับพัสดุ\n\n",
      indicator:
        "ใช้ผังน้ำประกอบการวางแผนบริหารจัดการทรัพยากรน้ำอย่างเป็นระบบ\n\n\n",
      status: "draf"
    };
    credentials = {
      username: "username",
      password: "password",
      firstname: "first name",
      lastname: "last name",
      email: "test@email.com",
      roles: ["user"]
    };
    token = jwt.sign(_.omit(credentials, "password"), config.jwt.secret, {
      expiresIn: 2 * 60 * 60 * 1000
    });
    done();
  });

  it("should be Pruposal get use token", done => {
    request(app)
      .get("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        done();
      });
  });

  it("should be Pruposal get by id", function(done) {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        request(app)
          .get("/api/pruposals/" + resp.data._id)
          .set("Authorization", "Bearer " + token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var resp = res.body;
            assert.equal(resp.status, 200);
            assert.equal(resp.data.name, mockup.name);
            assert.equal(resp.data.indicator, mockup.indicator)
            done();
          });
      });
  });

  it("should be Pruposal post use token", done => {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        assert.equal(resp.data.name, mockup.name);
        done();
      });
  });

  it("should be pruposal put use token", function(done) {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        var update = {
          name: "name update"
        };
        request(app)
          .put("/api/pruposals/" + resp.data._id)
          .set("Authorization", "Bearer " + token)
          .send(update)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            var resp = res.body;
            assert.equal(resp.data.name, update.name);
            done();
          });
      });
  });

  it("should be pruposal delete use token", function(done) {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        request(app)
          .delete("/api/pruposals/" + resp.data._id)
          .set("Authorization", "Bearer " + token)
          .expect(200)
          .end(done);
      });
  });

  it("should be pruposal get not use token", done => {
    request(app)
      .get("/api/pruposals")
      .expect(403)
      .expect({
        status: 403,
        message: "User is not authorized"
      })
      .end(done);
  });

  it("should be pruposal post not use token", function(done) {
    request(app)
      .post("/api/pruposals")
      .send(mockup)
      .expect(403)
      .expect({
        status: 403,
        message: "User is not authorized"
      })
      .end(done);
  });

  it("should be pruposal put not use token", function(done) {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        var update = {
          name: "name update"
        };
        request(app)
          .put("/api/pruposals/" + resp.data._id)
          .send(update)
          .expect(403)
          .expect({
            status: 403,
            message: "User is not authorized"
          })
          .end(done);
      });
  });

  it("should be pruposal delete not use token", function(done) {
    request(app)
      .post("/api/pruposals")
      .set("Authorization", "Bearer " + token)
      .send(mockup)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        var resp = res.body;
        request(app)
          .delete("/api/pruposals/" + resp.data._id)
          .expect(403)
          .expect({
            status: 403,
            message: "User is not authorized"
          })
          .end(done);
      });
  });

  afterEach(function(done) {
    Pruposal.deleteMany().exec(done);
  });
});
