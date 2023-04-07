import { toast } from "react-hot-toast";

interface CopyToClipboardProps {
  textToCopy: string;
}
export const CopyToClipboard = ({ textToCopy }: CopyToClipboardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    toast('Copied to clipboard');
  };
  return (
    <div onClick={handleCopy} className="flex items-center cursor-pointer">
      {textToCopy}
    </div>
  );
};
