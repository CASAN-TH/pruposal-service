"use strict";
// use model
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var PruposalSchema = new Schema({
  name: {
    type: String,
    required: "Please fill a Pruposal name"
  },
  plancode: String,
  projectcode: String,
  activitycode: String,
  sourcecode: String,
  owner:String,
  criteria: String,
  objectives: String,
  relatetostrategyoutside:String,
  relatetostrategyinside: String,
  location:String,
  targetgroup: String,
  timeline: String,
  process: String,
  resulthistory: String,
  budgetpaln:String,
  output: String,
  outcome: String,
  benefit: String,
  indicator: String,
  status: String,
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

mongoose.model("Pruposal", PruposalSchema);
