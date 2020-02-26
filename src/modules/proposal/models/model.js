'use strict';
// use model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var ProposalSchema = new Schema({
    name: {
        type: String,
        required: "Please fill a Pruposal name"
      },
      startdate:Date,
      enddate:Date,
      budgetyear:Number,
      budgetsummary:Number,
      budgetinyear:Number,
      compcode: String,
      deptcode: String,
      plancode: String,
      planname: String,
      projectcode: String,
      projectname: String,
      activitycode: String,
      activityname: String,
      sourcecode: String,
      sourcename: String,
      owner: String,
      criteria: String,
      objectives: String,
      relatetostrategyoutside: String,
      relatetostrategyinside: String,
      location: String,
      targetgroup: String,
      timeline: String,
      process: String,
      resulthistory: String,
      budgetpaln: String,
      output: String,
      outcome: String,
      benefit: String,
      indicator: String,
      status: {
        type:String,
        default: "initial"
      },
      activities: [
        {
          name: String,
          m01: { type: Number, default: 0 },
          m02: { type: Number, default: 0 },
          m03: { type: Number, default: 0 },
          m04: { type: Number, default: 0 },
          m05: { type: Number, default: 0 },
          m06: { type: Number, default: 0 },
          m07: { type: Number, default: 0 },
          m08: { type: Number, default: 0 },
          m09: { type: Number, default: 0 },
          m10: { type: Number, default: 0 },
          m11: { type: Number, default: 0 },
          m12: { type: Number, default: 0 },
          expenses:[{
            code:String,
            name: String,
            description:String,
            amount:Number
          }],
          tasks: [
            {
              name: String,
              start: Date,
              end: Date,
              seq: Number
            }
          ]
        }
      ],
      budgetcodetmp: String,
      budgetcode: String,
      file001Url: String,
      file002Url: String,
      file003Url: String,
      filesAttUrl:[String],
      created: {
        type: Date,
        default: Date.now
      },
      updated: {
        type: Date
      },
      createby: {
        _id: {
          type: String
        },
        username: {
          type: String
        },
        displayname: {
          type: String
        }
      },
      updateby: {
        _id: {
          type: String
        },
        username: {
          type: String
        },
        displayname: {
          type: String
        }
      }
});
//generate budgetcode tempolary before saving it to the database
ProposalSchema.pre("save", function(next) {
    var proposal = this;
    var prefix = `${proposal.compcode}${proposal.projectcode}${proposal.sourcecode}`;
    // pruposal.find(function(err, data) {
    //   console.log("sdasd");
  
    // });
    
    proposal.budgetcodetmp = `${prefix}XXXX`;
    next();
  });
mongoose.model("Proposal", ProposalSchema);