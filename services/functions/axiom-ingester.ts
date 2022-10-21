import { CloudWatchLogsEvent } from "aws-lambda";
import { gunzipSync } from "zlib";
import { assertNotUndefined } from "../utils/assert-not-undefined";
import fetch from "node-fetch";

type Log = {
  owner: string;
  logGroup?: string;
  logSteam: string;
  messageType: string;
  subscriptionFilters: string;
  logEvents: { message: string; timestamp: number }[];
  [k: string]: any;
};

type Event = CloudWatchLogsEvent;

const axiomToken = assertNotUndefined(
  process.env.AXIOM_TOKEN,
  "process.env.AXIOM_TOKEN is not set"
);

const axiomUrl =
  "https://cloud.axiom.co/api/v1/datasets/cloudwatch-logs/ingest";

const getJSONDataFromEvent = (event: Event) => {
  const body = Buffer.from(event.awslogs.data, "base64");
  const data = JSON.parse(gunzipSync(body).toString("ascii"));
  return data;
};

const splitLogGroup = (logGroup: string) => {
  const pattern = new RegExp("^/aws/(lambda|apigateway|eks|rds)/(.*)");
  const parsed = logGroup.match(pattern);

  if (!parsed) return { serviceName: "unknown", logGroupName: logGroup };

  const serviceName = parsed[0];
  const logGroupName = parsed[1];

  return {
    serviceName: serviceName ? serviceName : "unknown",
    logGroupName: logGroupName ? logGroupName : ""
  };
};

const pushEventsToAxiom = async (events: any[]) => {
  const res = await fetch(axiomUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${axiomToken}`
    },
    body: JSON.stringify(events)
  });

  if (res.status !== 200) {
    throw new Error(`Unexpected status ${res.status}`);
  }

  console.info(`Successfully pushed ${events.length} events to axiom`);
};

export const main = async (event: Event) => {
  const data = getJSONDataFromEvent(event) as Log;

  const awsFields = {
    owner: data.owner,
    logGroup: data.logGroup,
    logStream: data.logStream,
    messageType: data.messageType,
    subscriptionFilters: data.subscriptionFilters
  };

  if (data.logGroup) {
    const extra = splitLogGroup(data.logGroup);
    Object.assign(data, extra);
  }

  const events = [];
  for (const logEvent of data.logEvents) {
    const message = logEvent.message;
    const ev = {
      _time: logEvent.timestamp * 1000,
      aws: awsFields,
      message: message
    };
    events.push(ev);
  }

  await pushEventsToAxiom(events);
};
