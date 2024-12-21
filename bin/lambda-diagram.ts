#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { LambdaDiagramStack } from '../lib/lambda-diagram-stack';
import { stackProps } from "@martzmakes/constructs/cdk/bin/props";

const diagramStackProps = stackProps({ baseStackName: "diagram", envName: "main", eventSource: "martzmakes" });

const app = new App();
new LambdaDiagramStack(app, 'DiagramStack', {
  ...diagramStackProps,
});