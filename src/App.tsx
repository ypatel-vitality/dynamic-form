import MultiStepForm from './components/MultiStepForm';
import formConfig from "./formConfig.json";

function App() {
  return <MultiStepForm formConfig={formConfig} initialData={{}} />;
}

export default App
