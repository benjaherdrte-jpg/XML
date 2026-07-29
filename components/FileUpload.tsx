
import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileChange: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = React.memo(({ onFileChange, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
      setFileName(files[0].name);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
      setFileName(files[0].name);
    }
  };
  
  const baseClasses = 'border-slate-700 bg-slate-800/50';
  const activeClasses = 'hover:border-emerald-500 hover:bg-slate-800';
  const dragDropClasses = isDragging
    ? 'border-emerald-400 bg-slate-700/50'
    : `${baseClasses} ${!disabled ? activeClasses : ''}`;
  
  const cursorClass = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[2rem] transition-colors duration-300 ${dragDropClasses} ${cursorClass}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-10 h-10 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="mb-2 text-sm text-slate-400 font-medium"><span className="font-bold text-emerald-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-slate-500 font-medium">PDF, PNG, JPG (Image-based documents)</p>
          {fileName && <p className="mt-3 text-xs font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{fileName}</p>}
        </div>
        <input id="file-upload" type="file" className="hidden" onChange={handleChange} disabled={disabled} accept="image/jpeg,image/png,application/pdf"/>
      </label>
    </div>
  );
});
