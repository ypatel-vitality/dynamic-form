import React, { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import ClayButton from '@clayui/button';
import ClayForm, { ClayInput, ClayRadio, ClaySelect } from '@clayui/form';
import ClayLayout from '@clayui/layout';
import { ClayVerticalNav } from '@clayui/nav';
import ClayModal, { useModal } from '@clayui/modal';

interface Question {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'radio' | 'select' | 'date' | 'file';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  conditional?: {
    field: string;
    value: string[];
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

const STORAGE_KEY = 'healthAssessmentForm';
const STEP_KEY = 'healthAssessmentStep';

const MultiStepForm: React.FC<MultiStepFormProps> = ({ formConfig, initialData }) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingStepIndex, setPendingStepIndex] = useState<number | null>(null);

  const { observer, onClose } = useModal({
    onClose: () => setShowUnsavedModal(false),
  });

  const currentStep = formConfig.steps[stepIndex];

  // Load data and stepIndex from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedStep = localStorage.getItem(STEP_KEY);
    if (savedData) setFormData(JSON.parse(savedData));
    if (savedStep) setStepIndex(parseInt(savedStep, 10));
  }, []);

  // Save data and stepIndex to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    localStorage.setItem(STEP_KEY, stepIndex.toString());
  }, [stepIndex]);

  const handleChange = (id: string, value: any) => {
    setFormData({ ...formData, [id]: value });
    setErrors({ ...errors, [id]: '' });
  };

  const isVisible = (q: Question): boolean => {
    if (!q.conditional) return true;
    const { field, value } = q.conditional;
    return value.includes(formData[field]);
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    currentStep.questions.forEach((q) => {
      if (q.required && isVisible(q) && !formData[q.id]) {
        newErrors[q.id] = 'This field is required.';
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
      console.log('Final Data:', formData);
      alert('Form submitted successfully!');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_KEY);
    }
  };

  const handleSaveExit = () => {
    console.log('Saved Data:', formData);
    alert('Progress saved!');
    window.location.href = '/exit';
  };

  // Logic for enabling buttons
  const currentQuestions = currentStep.questions;
  const answeredQuestions = currentQuestions.filter((q) => {
    const val = formData[q.id];
    return val !== undefined && val !== null && val !== '';
  });

  const isSaveEnabled = answeredQuestions.length > 0;
  const isNextEnabled = answeredQuestions.length === currentQuestions.length;

  const renderQuestion = (q: Question) => {
    const value = formData[q.id] || '';
    const error = errors[q.id];
    return (
      <div key={q.id} className="form-group mb-3">
        <label className='h1 py-3 m-0'>{q.label}</label>
        {q.description !== '' && (
              <div className="vmp-gray-card p-4 mb-3">{q.description}</div>
            )}
        {q.type === 'text' && (
          <ClayInput
            type="text"
            placeholder={q.placeholder}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
          />
        )}
        {q.type === 'select' && (
          <ClaySelect
            value={value}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange(q.id, e.target.value)}
          >
            <ClaySelect.Option label="Select an option" value="" />
            {q.options?.map((opt) => (
              <ClaySelect.Option key={opt} label={opt} value={opt} />
            ))}
          </ClaySelect>
        )}
        {q.type === 'radio' &&
          q.options?.map((opt) => (
            <ClayRadio
              key={opt}
              label={opt}
              name={q.id}
              checked={value === opt}
              value={value === opt}
              onChange={() => handleChange(q.id, opt)}
            />
          ))}
        {q.type === 'date' && (
          <ClayInput
            type="date"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.value)}
          />
        )}
        {q.type === 'file' && (
          <ClayInput
            type="file"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(q.id, e.target.files?.[0])}
          />
        )}
        {error && <div className="text-danger">{error}</div>}
      </div>
    );
  };

  return (
    <>
      <ClayForm className="container" onSubmit={handleSubmit}>
        <div className="d-flex justify-content-between align-items-center pb-5 mb-3">
          <h6>{formConfig.title}</h6>
          <ClayButton displayType="secondary" onClick={handleSaveExit} disabled={!isSaveEnabled}>
            Save & Exit
          </ClayButton>
        </div>
        <ClayLayout.Row>
          <ClayLayout.Col size={4}>
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
                symbol: index < stepIndex ? 'fa-solid fa-check' : step.icon,
                title: step.description || ''
              }))}>
            {(item: any) => (
              <ClayVerticalNav.Item key={item.id} textValue="{item.label}" className={`${item.active ? 'active' : ''} vmp-mulistep-menu-item`} onClick={item.onClick} >
                  <span className="vmp-step-divider vmp-step-divider-top"></span>
                  {item.symbol && (
                    <i className={`${item.symbol} vmp-mulistep-menu-icon`} ></i>
                  )}
                  <span>{item.label}</span>
                  <span className="vmp-step-divider vmp-step-divider-bottom"></span>
              </ClayVerticalNav.Item>
            )}
				</ClayVerticalNav>
          </ClayLayout.Col>
          <ClayLayout.Col size={8}>
            <div className="d-flex justify-content-between align-items-end">
              <div className="d-flex c-gap-3 align-items-center">
                {currentStep.icon && (
                  <i className={`${currentStep.icon} vmp-mulistep-header-icon`} ></i>
                )}
                <h3 className="m-0">{currentStep.title}</h3>
              </div>
              <div>Section {stepIndex + 1} of {formConfig.steps.length}</div>
            </div>
            <div className='pb-4'></div>
            <hr />
            <div className='pb-4'></div>
            {currentStep.description && (
              <div className="pb-4 mb-3" dangerouslySetInnerHTML={{ __html: currentStep.description }} />
            )}
            {currentStep.questions.map((q) => isVisible(q) && renderQuestion(q))}
            <div className='pb-4'></div>
            <hr />
            <div className='pb-4'></div>
            <div className="d-flex justify-content-between mt-3">
              <div>
                {stepIndex > 0 && (
                  <ClayButton displayType="secondary" onClick={prevStep}>
                    Back
                  </ClayButton>
                )}
              </div>
              <div>
                {stepIndex < formConfig.steps.length - 1 ? (
                  <ClayButton displayType="primary" onClick={nextStep} className="ml-2" disabled={!isNextEnabled}>
                    Next
                  </ClayButton>
                ) : (
                  <ClayButton displayType="primary" type="submit" className="ml-2">
                    Submit assessment
                  </ClayButton>
                )}
              </div>
            </div>
          </ClayLayout.Col>
        </ClayLayout.Row>
      </ClayForm>

      {showUnsavedModal && (
        <ClayModal observer={observer} size="lg">
          <ClayModal.Header>You have unsaved changes</ClayModal.Header>
          <ClayModal.Body>
            You've made changes that haven't been saved. If you leave now, those changes will be lost.
          </ClayModal.Body>
          <ClayModal.Footer
            last={
              <>
                <ClayButton
                  displayType="secondary"
                  onClick={() => {
                    setShowUnsavedModal(false);
                    if (pendingStepIndex !== null) setStepIndex(pendingStepIndex);
                  }}
                >
                  Proceed without saving
                </ClayButton>
                <ClayButton
                  displayType="primary"
                  onClick={() => {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
                    setShowUnsavedModal(false);
                    if (pendingStepIndex !== null) setStepIndex(pendingStepIndex);
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