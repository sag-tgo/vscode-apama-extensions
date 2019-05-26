import * as yaml from 'js-yaml';
import * as jsonschema from 'jsonschema';
import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
const schema = require("../../test.schema.json");
import { connection } from '../server';


export function validateYamlConfig(textDocument: TextDocument): void {
  let diagnostics: Diagnostic[] = [];
  try {
    let currentDoc = yaml.safeLoad(textDocument.getText());
    let validator = new jsonschema.Validator();
    let result: jsonschema.ValidatorResult = validator.validate(currentDoc, schema);
    //this is for diagnostic purposes while I code...
    //for the time being
    //last test 
    //console.log(result);
    if (result.errors.length > 0) {
      result.errors.forEach((value: jsonschema.ValidationError, index: number) => {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: { line: index, character: 1 },
            end: { line: index, character: 20 }
          },
          message: value.toString(),
          source: "schema validation"
        });
      });
    }
  }
  catch (error) {
    //console.log(error.mark.line);
    //console.log(error.mark.column);
    let item = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: error.mark.line, character: 1 },
        end: { line: error.mark.line, character: error.mark.column }
      },
      message: error.message,
      source: "schema validation"
    };
    diagnostics.push(item);
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
