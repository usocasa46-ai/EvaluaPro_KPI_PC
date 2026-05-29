import { normalizeQuarterlyEvaluation } from "../services/quarterlyEvaluationService";
import { QuarterlyEvaluationTemplateDocument } from "./QuarterlyEvaluationTemplate";

export default function QuarterlyEvaluationPrint({ evaluation }) {
  return (
    <div className="print-only">
      <QuarterlyEvaluationTemplateDocument
        evaluation={normalizeQuarterlyEvaluation(evaluation || {})}
        readOnly
        onChangeField={() => {}}
        onChangeFactor={() => {}}
      />
    </div>
  );
}
