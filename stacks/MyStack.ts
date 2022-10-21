import { StackContext, Function } from "@serverless-stack/resources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as logs_destinations from "aws-cdk-lib/aws-logs-destinations";

function assertNotUndefined<T>(value: T | undefined, msg: string): T {
  if (!value) throw new Error(msg);
  return value;
}

export function MyStack({ stack }: StackContext) {
  const testFunction = new Function(stack, "TestFunc", {
    handler: "functions/lambda.main"
  });

  const axiomIngester = new Function(stack, "AxiomIngester", {
    handler: "functions/axiom-ingester.main",
    environment: {
      AXIOM_TOKEN: assertNotUndefined(
        process.env.AXIOM_TOKEN,
        "process.env.AXIOM_TOKEN is not set"
      )
    }
  });

  new logs.SubscriptionFilter(stack, "AxiomIngesterSubscriptionFilter", {
    logGroup: testFunction.logGroup,
    destination: new logs_destinations.LambdaDestination(axiomIngester),
    filterPattern: logs.FilterPattern.literal("")
  });
}
