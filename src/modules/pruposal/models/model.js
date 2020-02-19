"use strict";
// use model
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var PruposalSchema = new Schema({
  name: {
    type: String,
    required: "Please fill a Pruposal name"
  },
  compcode: String,
  deptcode: String,
  plancode: String,
  projectcode: String,
  activitycode: String,
  sourcecode: String,
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
  status: String,
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
PruposalSchema.pre("save", function(next) {
  var pruposal = this;
  pruposal.budgetcodetmp = `${pruposal.compcode}${pruposal.projectcode}${pruposal.sourcecode}XXXX`;
  next();
});
mongoose.model("Pruposal", PruposalSchema);
