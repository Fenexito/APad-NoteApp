import Header from "../components/ui/Header";
import FullForm from "../components/form/FullForm";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <Header />
      <FullForm />
    </div>
  );
}