import React, { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import ClayButton from "@clayui/button";
import ClayForm, { ClayInput, ClayRadio, ClaySelect } from "@clayui/form";
import ClayLayout from "@clayui/layout";
import { ClayVerticalNav } from "@clayui/nav";
import ClayModal, { useModal } from "@clayui/modal";

interface Question {
  id: string;
  label: string;
  description?: string;
  type: "text" | "radio" | "select" | "date" | "file";
  options?: string[];
  layout?: string;
  required?: boolean;
  placeholder?: string;
  conditional?: {
    field: string;
    value: string[]; // values to match against the controller field
  };
}

interface Step {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: Question[];
}

interface FormConfig {
  title: string;
  steps: Step[];
}

interface MultiStepFormProps {
  formConfig: FormConfig;
  initialData?: Record<string, any>;
}

const STORAGE_KEY = "healthAssessmentForm";
const STEP_KEY = "healthAssessmentStep";

const MultiStepForm: React.FC<MultiStepFormProps> = ({
  formConfig,
  initialData,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, any>>(
    initialData ?? {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingStepIndex, setPendingStepIndex] = useState<number | null>(null);

  const { observer } = useModal({
    onClose: () => setShowUnsavedModal(false),
  });

  useEffect(() => {
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [showUnsavedModal]);

  const currentStep = formConfig.steps[stepIndex];

  // ---------- helpers ----------
  const normalizeValue = (val: any) => {
    if (typeof val === "string") return val.trim(); // handle "0 - 2 hours\r" etc.
    return val;
  };

  const isEmptyValue = (val: any): boolean => {
    if (val === undefined || val === null) return true;
    if (typeof val === "string") return val.trim() === "";
    if (Array.isArray(val)) return val.length === 0;
    // File/number/objects are considered present
    return false;
  };

  // NOTE: make the conditional robust to string vs number by stringifying
  const isVisible = (q: Question): boolean => {
    if (!q.conditional) return true;
    const { field, value } = q.conditional;
    const fieldVal = formData[field];
    return value.map(String).includes(String(fieldVal));
  };

  // ---------- lifecycle ----------
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedStep = localStorage.getItem(STEP_KEY);
    if (savedData) setFormData(JSON.parse(savedData));
    if (savedStep) setStepIndex(parseInt(savedStep, 10));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem(STEP_KEY, stepIndex.toString());
  }, [stepIndex]);

  // ---------- events ----------
  const handleChange = (id: string, value: any) => {
    const normalized = normalizeValue(value);
    setFormData({ ...formData, [id]: normalized });
    setErrors({ ...errors, [id]: "" });
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    currentStep.questions.forEach((q) => {
      if (q.required && isVisible(q) && isEmptyValue(formData[q.id])) {
        newErrors[q.id] = "This field is required.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStepIndex((prev) => prev - 1);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      console.log("Final Data:", formData);
      alert("Form submitted successfully!");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_KEY);
    }
  };

  
const handleSaveExit = () => {
  const allVisibleAnswered = visibleQuestions.every(q => !isEmptyValue(formData[q.id]));

  if (!allVisibleAnswered) {
    setShowUnsavedModal(true);
    setPendingStepIndex(null); // Indicates Save & Exit triggered modal
  } else {
    console.log("Saved Data:", formData);
    alert("Progress saved!");
    window.location.href = "/exit";
  }
};


  // ---------- enablement (use only VISIBLE questions) ----------
  const currentQuestions = currentStep.questions;
  const visibleQuestions = currentQuestions.filter(isVisible);

  // If you want Next to require all visible questions (including optional), use visibleQuestions.
  // Common pattern: require only visible+required
  const requiredVisibleQuestions = visibleQuestions.filter((q) => !!q.required);

  const answeredRequiredVisible = requiredVisibleQuestions.filter((q) => {
    const val = formData[q.id];
    return !isEmptyValue(val);
  });

  const isNextEnabled =
    answeredRequiredVisible.length === requiredVisibleQuestions.length;

  // Save enabled if any visible question has an answer
  const isSaveEnabled = visibleQuestions.some(
    (q) => !isEmptyValue(formData[q.id])
  );

  // ---------- render ----------
  const renderQuestion = (q: Question) => {
    const value = formData[q.id] ?? "";
    const error = errors[q.id];

    return (
      <div
        key={q.id}
        className={`${error ? "vmp-has-error" : ""} form-group mb-3`}
      >
        <label className="h1 py-3 m-0 d-block">{q.label}</label>

        {!!q.description && (
          <div className="vmp-gray-card p-4 mb-3">{q.description}</div>
        )}

        {q.type === "text" && (
          <ClayInput
            type="text"
            placeholder={q.placeholder}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(q.id, e.target.value)
            }
          />
        )}

        {q.type === "select" && (
          <ClaySelect
            value={value}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              handleChange(q.id, e.target.value)
            }
          >
            <ClaySelect.Option label="Select an option" value="" />
            {q.options?.map((opt) => (
              <ClaySelect.Option key={opt} label={opt} value={opt} />
            ))}
          </ClaySelect>
        )}

        {q.type === "radio" &&
          q.options?.map((opt) => (
            <ClayRadio
              key={opt}
              label={opt}
              name={q.id}
              checked={value === opt}
              value={opt}
              inline={q?.layout === "inline"}
              onChange={() => handleChange(q.id, opt)}
            />
          ))}

        {q.type === "date" && (
          <ClayInput
            type="date"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(q.id, e.target.value)
            }
          />
        )}

        {q.type === "file" && (
          <ClayInput
            type="file"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(q.id, e.target.files?.[0])
            }
          />
        )}

        {error && (
          <div className="form-feedback-item text-danger">
            <i className="fa fa-exclamation-circle" aria-hidden="true"></i>{" "}
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    <div className="container">
      <ClayForm className="vmp-mulistep-form" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center pb-5 mb-3">
          <h6>{formConfig.title}</h6>
          <ClayButton
            displayType="secondary"
            onClick={handleSaveExit}
            disabled={!isSaveEnabled}
          >
            Save & Exit
          </ClayButton>
        </div>

        <ClayLayout.Row>
          <ClayLayout.Col md={4} sm={12}>
            <ClayVerticalNav
              items={formConfig.steps.map((step, index) => ({
                id: step.id,
                label: step.title,
                active: index === stepIndex,
                onClick: () => {
                  const isCurrentStepValid = validateStep();
                  if (!isCurrentStepValid) {
                    setPendingStepIndex(index);
                    setShowUnsavedModal(true);
                  } else {
                    setStepIndex(index);
                  }
                },
                symbol: index < stepIndex ? "fa-solid fa-check" : step.icon,
                title: step.description ?? "",
              }))}
            >
              {(item: any) => (
                <ClayVerticalNav.Item
                  key={item.id}
                  textValue="{item.label}"
                  className={`${
                    item.active ? "active" : ""
                  } vmp-mulistep-menu-item`}
                  onClick={() => {}}
                >
                  <span className="vmp-step-divider vmp-step-divider-top"></span>
                  {item.symbol && (
                    <i className={`${item.symbol} vmp-mulistep-menu-icon`}></i>
                  )}
                  <span>{item.label}</span>
                  <span className="vmp-step-divider vmp-step-divider-bottom"></span>
                </ClayVerticalNav.Item>
              )}
            </ClayVerticalNav>
          </ClayLayout.Col>

          <ClayLayout.Col md={8} sm={12}>
            <div className="d-none d-md-flex justify-content-between align-items-end">
              <div className="d-flex c-gap-3 align-items-center">
                {currentStep.icon && (
                  <i
                    className={`${currentStep.icon} vmp-mulistep-header-icon`}
                  ></i>
                )}
                <h3 className="m-0">{currentStep.title}</h3>
              </div>
              <div>
                Section {stepIndex + 1} of {formConfig.steps.length}
              </div>
            </div>

            <div className="d-flex d-md-none c-gap-3 align-items-start">
              <div className="d-flex align-items-center">
                {currentStep.icon && (
                  <i
                    className={`${currentStep.icon} vmp-mulistep-header-icon`}
                  ></i>
                )}
                
              </div>
              <div>
                <h3>{currentStep.title}</h3>
                <div>Section {stepIndex + 1} of {formConfig.steps.length}</div>
              </div>
            </div>

            <div className="pb-4"></div>
            <hr />
            <div className="pb-4"></div>

            {!!currentStep.description && (
              <div
                className="figure-img pb-4 mb-3"
                dangerouslySetInnerHTML={{ __html: currentStep.description }}
              />
            )}

            {currentStep.questions.map(
              (q) => isVisible(q) && renderQuestion(q)
            )}

            <div className="pb-4"></div>
            <hr />
            <div className="pb-4"></div>

            <div className="row mt-3 px-2">
              <div className="col-6">
                {stepIndex > 0 && (
                  <ClayButton
                    displayType="secondary"
                    className="btn-block mr-2"
                    onClick={prevStep}
                  >
                    Back
                  </ClayButton>
                )}
              </div>
              <div className="col-6">
                {stepIndex < formConfig.steps.length - 1 ? (
                  <ClayButton
                    displayType="primary"
                    onClick={nextStep}
                    className="btn-block ml-2"
                    disabled={!isNextEnabled}
                  >
                    Next
                  </ClayButton>
                ) : (
                  <ClayButton
                    displayType="primary"
                    type="submit"
                    className="btn-block ml-2"
                    disabled={!isNextEnabled}
                  >
                    Submit assessment
                  </ClayButton>
                )}
              </div>
            </div>
          </ClayLayout.Col>
        </ClayLayout.Row>
      </ClayForm>
    </div>

      {showUnsavedModal && (
        <ClayModal observer={observer} size="lg">
          <ClayModal.Header withTitle={false}>
            <ClayModal.ItemGroup>
              {/* Title Section */}
              <ClayModal.Item>
                <ClayModal.TitleSection>
                  <ClayModal.Title>You have unsaved changes</ClayModal.Title>
                </ClayModal.TitleSection>
              </ClayModal.Item>

              {/* Close Button Section */}
              <ClayModal.Item shrink>
                <ClayButton
                  aria-label="Close"
                  className="fas fa-times vmp-close-icon"
                  displayType="unstyled"
                  onClick={() => setShowUnsavedModal(false)}
                />
              </ClayModal.Item>
            </ClayModal.ItemGroup>
          </ClayModal.Header>
          <ClayModal.Body>
            You've made changes that haven't been saved. If you leave now, those
            changes will be lost.
          </ClayModal.Body>
          <ClayModal.Footer
  last={
    <>
      <ClayButton
        className="mr-3"
        displayType="secondary"
        onClick={() => {
          setShowUnsavedModal(false);
          if (pendingStepIndex !== null) {
            setStepIndex(pendingStepIndex);
          } else {
            window.location.href = "/exit"; // Save & Exit path
          }
        }}
      >
        Proceed without saving
      </ClayButton>
      <ClayButton
        displayType="primary"
        className="btn-sm"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
          setShowUnsavedModal(false);
          if (pendingStepIndex !== null) {
            setStepIndex(pendingStepIndex);
          } else {
            window.location.href = "/exit"; // Save & Exit path
          }
        }}
      >
        Save and proceed
      </ClayButton>
    </>
  }
/>
        </ClayModal>
      )}
    </>
  );
};

export default MultiStepForm;
