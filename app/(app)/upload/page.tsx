import UploadForm from "@/components/upload/UploadForm"; 

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      <UploadForm />
    </div>
  );
}