"use client";

import React, { useState, useRef } from "react";
import { Upload, File, Image, Check, AlertCircle, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FileUploadProps {
  bucket: "invoices" | "receipts";
  onUploadComplete: (url: string) => void;
  allowedTypes?: string[]; // e.g. ['application/pdf', 'image/jpeg', 'image/png']
  maxSizeMB?: number;
}

export default function FileUpload({
  bucket,
  onUploadComplete,
  allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 5,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const validateFile = (file: File): boolean => {
    setError(null);
    
    if (!allowedTypes.includes(file.type)) {
      setError(`Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP`);
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds limit (${maxSizeMB}MB)`);
      return false;
    }

    return true;
  };

  const handleUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setLoading(true);
    setError(null);
    setProgress(10);

    const isSupabaseConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://[YOUR-PROJECT-REF].supabase.co";

    if (!isSupabaseConfigured) {
      // Mock Upload Progress for Demo mode when Supabase is not yet configured
      console.warn("Supabase credentials not fully configured. Using Demo Mock upload.");
      
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 15;
        });
      }, 150);

      setTimeout(() => {
        clearInterval(interval);
        // Create an object URL from the local file for demo viewing
        const mockUrl = URL.createObjectURL(file);
        setUploadedFile({ name: file.name, url: mockUrl });
        onUploadComplete(mockUrl);
        setLoading(false);
      }, 1200);

      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(40);
      
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(80);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUploadedFile({ name: file.name, url: publicUrl });
      onUploadComplete(publicUrl);
      setProgress(100);
    } catch (err: any) {
      console.error("Storage upload error:", err);
      setError(err.message || "Failed to upload file. Make sure bucket is created in Supabase console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div style={{ width: "100%" }}>
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleChange}
        accept={allowedTypes.join(",")}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        style={{
          border: `2px dashed ${dragActive ? "var(--primary)" : "var(--border-color)"}`,
          backgroundColor: dragActive ? "var(--primary-light)" : "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-lg)",
          textAlign: "center",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {loading ? (
          <>
            <Loader className="spinner" size={32} style={{ color: "var(--primary)" }} />
            <div style={{ fontSize: "14px", fontWeight: 500 }}>
              Uploading... {progress}%
            </div>
            <div
              style={{
                width: "80%",
                height: "4px",
                backgroundColor: "var(--border-color)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "var(--primary)",
                  transition: "width 0.2s",
                }}
              />
            </div>
          </>
        ) : uploadedFile ? (
          <>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--success-light)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={24} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Upload Complete
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  maxWidth: "240px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "4px",
                }}
              >
                {uploadedFile.name}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
                onUploadComplete("");
              }}
              style={{
                fontSize: "12px",
                color: "var(--danger)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Remove file
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-color)",
              }}
            >
              <Upload size={20} />
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                Click to upload or drag & drop
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                PDF, PNG, JPG, or WEBP up to {maxSizeMB}MB
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--danger)",
            fontSize: "13px",
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "var(--danger-light)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
