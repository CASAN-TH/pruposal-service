'use strict';
var controller = require('../controllers/controller'),
    mq = require('../../core/controllers/rabbitmq'),
    policy = require('../policy/policy');
module.exports = function (app) {
    var url = '/api/proposals';
    var urlWithParam = '/api/proposals/:proposalId';
    app.route(url).all(policy.isAllowed)
        .get(controller.getList)
        .post(controller.createFile001AndUpload,controller.createFile003AndUpload, controller.create);

    app.route(urlWithParam).all(policy.isAllowed)
        .get(controller.read)
        .put(controller.createFile001AndUpload,controller.createFile002AndUpload,controller.createFile003AndUpload, controller.update)
        .delete(controller.delete);

    app.param('proposalId', controller.getByID);

    app.route("/api/v1/proposals/upload")
    .post(controller.upload);
    /**
     * Message Queue
     * exchange : ชื่อเครือข่ายไปรษณีย์  เช่น casan
     * qname : ชื่อสถานีย่อย สาขา
     * keymsg : ชื่อผู้รับ
     */
    // mq.consume('exchange', 'qname', 'keymsg', (msg)=>{
    //     console.log(JSON.parse(msg.content));
        
    // });
}