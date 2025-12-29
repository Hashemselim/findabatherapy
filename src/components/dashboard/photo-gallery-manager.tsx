"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Upload, X, Loader2, ImageIcon, GripVertical, Sparkles, Camera, Users, Heart, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getPhotos, uploadPhoto, deletePhoto, reorderPhotos } from "@/lib/storage/actions";
import { FILE_SIZE_LIMITS, ALLOWED_IMAGE_TYPES, PHOTO_LIMITS } from "@/lib/storage/config";

interface PhotoGalleryManagerProps {
  planTier: string;
}

interface Photo {
  id: string;
  url: string;
  order: number;
}

export function PhotoGalleryManager({ planTier }: PhotoGalleryManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoLimit = PHOTO_LIMITS[planTier as keyof typeof PHOTO_LIMITS] || 0;
  const isPremium = planTier !== "free";

  // Load photos on mount
  useEffect(() => {
    async function loadPhotos() {
      const result = await getPhotos();
      if (result.success && result.data) {
        setPhotos(result.data.photos);
      }
      setIsLoading(false);
    }
    loadPhotos();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      setError("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > FILE_SIZE_LIMITS.photo) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadPhoto(formData);

    if (result.success && result.data) {
      setPhotos((prev) => [...prev, { ...result.data!, order: prev.length }]);
    } else {
      setError(result.success ? "Upload failed" : result.error);
    }

    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    setDeletingId(photoId);
    setError(null);

    const result = await deletePhoto(photoId);

    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      setError(result.error);
    }

    setDeletingId(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhotos = [...photos];
    const draggedPhoto = newPhotos[draggedIndex];
    newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(index, 0, draggedPhoto);

    setPhotos(newPhotos);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      // Save new order to server
      await reorderPhotos(photos.map((p) => p.id));
    }
    setDraggedIndex(null);
  };

  if (!isPremium) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/80 via-white to-slate-50 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.06),transparent_50%)]" />

        <div className="relative p-6">
          {/* Header with strong value prop */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Photo Gallery</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Sparkles className="h-3 w-3" />
                  Pro
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">A picture is worth a thousand words.</span> Families want to see where their child will spend time. Show them your welcoming space, friendly team, and real therapy sessions.
              </p>
            </div>
          </div>

          {/* What photos to add */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Your Space</p>
                <p className="text-xs text-slate-500">Therapy rooms, waiting area, play spaces</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Your Team</p>
                <p className="text-xs text-slate-500">Therapists families will meet</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">In Action</p>
                <p className="text-xs text-slate-500">Real therapy moments (with consent)</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Upload up to 10 photos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Drag & drop to reorder</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>High-quality display</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Build trust before the first call</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Ready to show families your practice?</span>
            </p>
            <Button asChild size="sm" className="w-full shrink-0 rounded-full sm:w-auto">
              <Link href="/dashboard/billing">
                Upgrade Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Photo Gallery
        </CardTitle>
        <CardDescription>
          Add up to {photoLimit} photos of your facility. Drag to reorder. Max file size: 5MB per photo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Photo Grid */}
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative aspect-video cursor-move overflow-hidden rounded-lg border bg-muted ${
                    draggedIndex === index ? "opacity-50 ring-2 ring-primary" : ""
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt={`Gallery photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />

                  {/* Drag Handle */}
                  <div className="absolute left-2 top-2 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-4 w-4 text-white" />
                  </div>

                  {/* Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                        disabled={deletingId === photo.id}
                      >
                        {deletingId === photo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <X className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this photo? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(photo.id)}
                          className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}

              {/* Upload Button */}
              {photos.length < photoLimit && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary hover:bg-muted/50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {/* Photo Count */}
            <p className="text-sm text-muted-foreground">
              {photos.length} of {photoLimit} photos used
            </p>

            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
