#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { LambdaMermaidStack } from '../lib/lambda-mermaid-stack';
import { stackProps } from "@martzmakes/constructs/cdk/bin/props";

const mermaidStackProps = stackProps({ baseStackName: "mermaid", envName: "main" });

const app = new App();
new LambdaMermaidStack(app, 'LambdaMermaidStack', {
  ...mermaidStackProps,
});