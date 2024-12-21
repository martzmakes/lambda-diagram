import { MMStackProps } from "@martzmakes/constructs/cdk/interfaces/MMStackProps";
import { MMStack } from "@martzmakes/constructs/cdk/stacks/MMStack";
import { Lambda } from "@martzmakes/constructs/cdk/constructs/lambda";
import { Construct } from "constructs";
import { RemovalPolicy, Duration } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { join } from "path";

export class LambdaDiagramStack extends MMStack {
  constructor(scope: Construct, id: string, props: MMStackProps) {
    super(scope, id, props);
    const diagramBucket = new Bucket(this, "DiagramBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      eventBridgeEnabled: true,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
          enabled: true,
        },
      ],
    });

    new Lambda(this, "MermaidLambda", {
      entry: join(__dirname, `./fns/mermaid.ts`),
      eventPattern: {
        source: [this.eventSource],
        detailType: ["mermaid"],
      },
      name: "mermaid",
      architecture: Architecture.X86_64, // puppeteer needs x86_64
      bundling: {
        externalModules: [],
      },
      memorySize: 10240,
      buckets: {
        BUCKET_NAME: { bucket: diagramBucket, access: "rw" },
      },
    });

    new Lambda(this, "DrawIOLambda", {
      entry: join(__dirname, `./fns/drawio.ts`),
      eventPattern: {
        source: [this.eventSource],
        detailType: ["drawio"],
      },
      bundling: {
        externalModules: [],
      },
      name: "drawio",
      architecture: Architecture.X86_64, // puppeteer needs x86_64
      memorySize: 10240,
      buckets: {
        BUCKET_NAME: { bucket: diagramBucket, access: "rw" },
      },
    });
  }
}
