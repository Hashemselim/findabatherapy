"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadLogo, deleteLogo } from "@/lib/storage/actions";
import { FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES } from "@/lib/storage/config";

interface LogoUploaderProps {
  currentLogoUrl: string | null;
}

export function LogoUploader({ currentLogoUrl }: LogoUploaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      setError("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > FILE_SIZE_LIMITS.logo) {
      setError("File too large. Maximum size is 2MB.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadLogo(formData);

    if (result.success && result.data) {
      setLogoUrl(result.data.url);
    } else {
      setError(result.success ? "Upload failed" : result.error);
    }

    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deleteLogo();

    if (result.success) {
      setLogoUrl(null);
    } else {
      setError(result.error);
    }

    setIsDeleting(false);
  };

  return (
    <div className="space-y-2">
      <Label>Logo</Label>
      <p className="text-xs text-muted-foreground">
        Upload your agency logo. Recommended size: 400x400 pixels. Max file size: 2MB.
      </p>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* Logo Preview */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Agency logo"
              fill
              className="object-contain p-2"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </>
            )}
          </Button>

          {logoUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Remove Logo
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Logo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove your logo? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
