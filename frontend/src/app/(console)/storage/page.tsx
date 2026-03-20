"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  StorageVolume as ApiStorageVolume,
  getStorageVolumes,
  checkStorageName,
  createStorageVolume,
  deleteStorageVolume,
  getStorageFiles,
  FileItem as ApiFileItem,
  getBillingData,
  createStorageFolder,
  uploadStorageFiles,
  downloadStorageFile,
  deleteStorageFile,
} from "@/lib/api";

// Storage types (from API)
interface StorageVolume {
  id: string;
  name: string;
  storageUid: string;
  quotaGb: number;
  usedGb: number;
  status: string;
  allocationType: string;
  provisionedAt: string | null;
  createdAt: string;
}

// File types - extend API type with UI-specific fields
interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: string;
  size?: number | null;
  updatedAt: string;
  parentPath?: string;
}

// Tab types
type FilterTab = "all" | "images" | "videos" | "files";

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function StoragePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDeleteNote, setShowDeleteNote] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [storages, setStorages] = useState<StorageVolume[]>([]);
  const [loadingStorages, setLoadingStorages] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Folder navigation state - using path strings
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [pathHistory, setPathHistory] = useState<{ path: string; name: string }[]>([]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId && !(e.target as Element).closest('[data-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  // One user has only one storage allocation
  const hasStorage = storages.length > 0;

  // Live storage usage from ZFS (fetched via billing endpoint)
  const [liveUsedGb, setLiveUsedGb] = useState<number | null>(null);
  const [liveUsagePercent, setLiveUsagePercent] = useState<number | null>(null);

  // Calculate totals - prefer live ZFS data over DB-cached values
  const totalAllocated = storages.reduce((sum, s) => sum + s.quotaGb, 0);
  const totalUsed = liveUsedGb ?? storages.reduce((sum, s) => sum + s.usedGb, 0);
  const usagePercent = liveUsagePercent ?? (totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0);

  // Fetch storage volumes and live usage on mount
  useEffect(() => {
    const fetchStorages = async () => {
      try {
        const data = await getStorageVolumes();
        setStorages(data);
      } catch (error) {
        console.error("Failed to fetch storages:", error);
      } finally {
        setLoadingStorages(false);
      }
    };
    const fetchLiveUsage = async () => {
      try {
        const billing = await getBillingData();
        if (billing) {
          setLiveUsedGb(billing.storageUsedGb);
          setLiveUsagePercent(billing.storageUsagePercent);
        }
      } catch (error) {
        console.error("Failed to fetch live storage usage:", error);
      }
    };
    fetchStorages();
    fetchLiveUsage();
  }, []);

  // Fetch files when path changes or storage becomes available
  useEffect(() => {
    if (!hasStorage) return;
    
    const fetchFiles = async () => {
      setLoadingFiles(true);
      try {
        const apiFiles = await getStorageFiles(currentPath);
        // Transform API response to UI FileItem format
        const uiFiles: FileItem[] = apiFiles.map((f, index) => {
          // Extract file extension for fileType
          const ext = f.name.includes('.') ? f.name.split('.').pop()?.toLowerCase() : undefined;
          // Format the date for display
          const date = new Date(f.updatedAt);
          const formattedDate = date.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          
          return {
            id: `${currentPath}/${f.name}-${index}`,
            name: f.name,
            type: f.type,
            fileType: ext,
            size: f.size,
            updatedAt: formattedDate,
            parentPath: currentPath,
          };
        });
        setFiles(uiFiles);
      } catch (error) {
        console.error("Failed to fetch files:", error);
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };
    fetchFiles();
  }, [hasStorage, currentPath]);

  // Refresh files helper - reusable for mkdir, upload, delete
  const refreshFiles = async () => {
    setLoadingFiles(true);
    try {
      const apiFiles = await getStorageFiles(currentPath);
      const uiFiles: FileItem[] = apiFiles.map((f, index) => {
        const ext = f.name.includes('.') ? f.name.split('.').pop()?.toLowerCase() : undefined;
        const date = new Date(f.updatedAt);
        const formattedDate = date.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return {
          id: `${currentPath}/${f.name}-${index}`,
          name: f.name,
          type: f.type,
          fileType: ext,
          size: f.size,
          updatedAt: formattedDate,
          parentPath: currentPath,
        };
      });
      setFiles(uiFiles);
    } catch (error) {
      console.error('Failed to refresh files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Refresh live usage stats - call after upload/delete
  const refreshLiveUsage = async () => {
    try {
      const billing = await getBillingData();
      if (billing) {
        setLiveUsedGb(billing.storageUsedGb);
        setLiveUsagePercent(billing.storageUsagePercent);
      }
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  };

  // Handle file upload
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      await uploadStorageFiles(currentPath, Array.from(selectedFiles));
      await refreshFiles();
      await refreshLiveUsage();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle storage creation success
  const handleStorageCreated = (volume: StorageVolume) => {
    setStorages((prev) => [volume, ...prev]);
  };

  // Handle storage deletion
  const handleDeleteStorage = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteStorageVolume(id);
      setStorages((prev) => prev.filter((s) => s.id !== id));
      setShowDeleteNote(false);
    } catch (error) {
      console.error("Failed to delete storage:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter files based on tab and search (files are already filtered by current path from API)
  const filteredFiles = files.filter((file) => {
    // Search filter
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Tab filter
    if (activeTab === "images" && file.type === "file") {
      const ext = file.fileType?.toLowerCase();
      if (!["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "")) {
        return false;
      }
    }
    if (activeTab === "videos" && file.type === "file") {
      const ext = file.fileType?.toLowerCase();
      if (!["mp4", "avi", "mov", "mkv", "webm"].includes(ext || "")) {
        return false;
      }
    }
    if (activeTab === "files" && file.type === "folder") {
      return false;
    }
    return true;
  });

  // Navigation functions - path based
  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
    setPathHistory([...pathHistory, { path: newPath, name: folderName }]);
    setOpenMenuId(null);
  };

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousFolder = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentPath(previousFolder ? previousFolder.path : "/");
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath("/");
      setPathHistory([]);
    } else {
      const newHistory = pathHistory.slice(0, index + 1);
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1].path);
    }
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "files", label: "Files" },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
              marginBottom: "8px",
              lineHeight: 1.2,
            }}
          >
            File Store allocation
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-muted)",
              margin: 0,
              maxWidth: "560px",
              lineHeight: 1.5,
            }}
          >
            High-performance NFS storage mounted on your compute instances. 
            Billed per GB per month.
          </p>
        </div>
        {hasStorage ? (
          <button
            onClick={() => setShowDeleteNote(true)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-inverse)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 20px",
              height: "40px",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Delete & Recreate
          </button>
        ) : (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-inverse)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 20px",
              height: "40px",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Create File Store
          </button>
        )}
      </div>

      {/* Delete Note Modal */}
      {showDeleteNote && (
        <div
          style={{
            backgroundColor: "var(--bgColor-warning-section)",
            border: "1px solid var(--borderColor-warning)",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--fgColor-warning)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: "2px" }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                margin: 0,
                marginBottom: "12px",
                lineHeight: 1.5,
              }}
            >
              To create a new File Store, you must delete the existing one first. 
              All data will be permanently lost.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowDeleteNote(false)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--fgColor-default)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: "0 16px",
                  height: "32px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (storages.length > 0) {
                    handleDeleteStorage(storages[0].id);
                  }
                }}
                disabled={deletingId !== null}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "var(--fgColor-critical)",
                  border: "1px solid var(--fgColor-critical)",
                  borderRadius: "4px",
                  padding: "0 16px",
                  height: "32px",
                  cursor: deletingId ? "not-allowed" : "pointer",
                  opacity: deletingId ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {deletingId ? (
                  <>
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Deleting...
                  </>
                ) : (
                  "Delete Existing"
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteNote(false)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--fgColor-muted)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Show "No filesystems" state when storage is not provisioned */}
      {!loadingStorages && !hasStorage && (
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "64px 24px",
            textAlign: "center",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--fgColor-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto 16px", opacity: 0.6 }}
          >
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-9l-2-3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
          </svg>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: "0 0 8px 0",
            }}
          >
            No filesystems
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-muted)",
              margin: "0 0 24px 0",
              maxWidth: "400px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Filesystems offer fast, nearly infinite storage that can be mounted to your instance(s).
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-inverse)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 20px",
              height: "40px",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Create a filesystem
          </button>
        </div>
      )}

      {/* Storage Usage Card and Files Section - only show when storage exists */}
      {hasStorage && (
      <>
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                color: "var(--fgColor-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "4px",
              }}
            >
              Total Storage
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "var(--fgColor-default)",
                }}
              >
                {totalUsed > 0 ? `${totalUsed.toFixed(2)} GB` : "0 GB"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                }}
              >
                of {totalAllocated > 0 ? `${totalAllocated} GB` : "0 GB"} allocated
              </span>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div
          style={{
            marginTop: "16px",
            height: "4px",
            backgroundColor: "var(--borderColor-muted)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              height: "100%",
              backgroundColor: "var(--fgColor-info)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Files Section */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {/* Files Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--borderColor-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px" }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.8125rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--fgColor-inverse)" : "var(--fgColor-muted)",
                    backgroundColor: isActive ? "var(--fgColor-default)" : "transparent",
                    border: "1px solid",
                    borderColor: isActive ? "var(--fgColor-default)" : "var(--borderColor-default)",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    height: "32px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: "1", maxWidth: "280px" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--fgColor-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search files"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                color: "var(--fgColor-default)",
                backgroundColor: "transparent",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: "0 12px 0 36px",
                height: "32px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Refresh Button */}
            <button
              onClick={async () => {
                await refreshFiles();
                await refreshLiveUsage();
              }}
              disabled={loadingFiles}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                backgroundColor: "transparent",
                border: "1px solid var(--borderColor-default)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--fgColor-muted)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>

            {/* New Folder Button */}
            <button
              onClick={() => setShowNewFolderModal(true)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                backgroundColor: "transparent",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: "0 12px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(11, 11, 11, 0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* Minimal folder-plus icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-9l-2-3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              New Folder
            </button>

            {/* Hidden file input for uploads */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleUploadFiles}
            />

            {/* Upload Files Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--fgColor-inverse)",
                backgroundColor: "var(--fgColor-default)",
                border: "1px solid var(--fgColor-default)",
                borderRadius: "4px",
                padding: "0 12px",
                height: "32px",
                cursor: uploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "opacity 0.15s ease",
                opacity: uploading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => !uploading && (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => !uploading && (e.currentTarget.style.opacity = "1")}
            >
              {uploading ? (
                <>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "2px solid var(--fgColor-inverse)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Uploading...
                </>
              ) : (
                <>
                  {/* Minimal upload icon */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Files
                </>
              )}
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {pathHistory.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              backgroundColor: "var(--bgColor-muted)",
              borderBottom: "1px solid var(--borderColor-muted)",
            }}
          >
            {/* Back Button */}
            <button
              onClick={navigateBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                backgroundColor: "var(--bgColor-default)",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
                e.currentTarget.style.borderColor = "var(--fgColor-muted)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bgColor-default)";
                e.currentTarget.style.borderColor = "var(--borderColor-default)";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>

            {/* Breadcrumb Path */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {/* Root */}
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "var(--fgColor-info)",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bgColor-default)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                File Store
              </button>

              {/* Path Segments */}
              {pathHistory.map((folder, index) => (
                <div key={folder.path} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--fgColor-muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: index === pathHistory.length - 1 ? "var(--bgColor-default)" : "transparent",
                      border: "none",
                      borderRadius: "4px",
                      cursor: index === pathHistory.length - 1 ? "default" : "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: "0.8125rem",
                      fontWeight: index === pathHistory.length - 1 ? 600 : 500,
                      color: index === pathHistory.length - 1 ? "var(--fgColor-default)" : "var(--fgColor-info)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (index !== pathHistory.length - 1) {
                        e.currentTarget.style.backgroundColor = "var(--bgColor-default)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== pathHistory.length - 1) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File List Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px 100px 160px 40px",
            gap: "12px",
            padding: "8px 20px",
            borderBottom: "1px solid var(--borderColor-muted)",
            backgroundColor: "var(--bgColor-muted)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--fgColor-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            File Name
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--fgColor-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Type
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--fgColor-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Size
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--fgColor-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            Updated On
          </div>
          <div />
        </div>

        {/* File List */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {filteredFiles.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              {/* Minimal empty state icon */}
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--fgColor-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: "0 auto 16px", opacity: 0.6 }}
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-9l-2-3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-muted)",
                  margin: 0,
                }}
              >
                No files found
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                currentPath={currentPath}
                isMenuOpen={openMenuId === file.id}
                onMenuToggle={() => setOpenMenuId(openMenuId === file.id ? null : file.id)}
                onDelete={async () => {
                  if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;
                  setOpenMenuId(null);
                  try {
                    const filePath = currentPath === '/' ? file.name : `${currentPath}/${file.name}`;
                    await deleteStorageFile(filePath.replace(/^\//, ''));
                    await refreshFiles();
                    await refreshLiveUsage();
                  } catch (error) {
                    console.error('Delete failed:', error);
                    alert('Delete failed: ' + (error as Error).message);
                  }
                }}
                onFolderClick={navigateToFolder}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Storage Modal */}
      {isCreateModalOpen && (
        <CreateStorageModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleStorageCreated}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => setShowNewFolderModal(false)}
          onCreate={async (folderName: string) => {
            try {
              await createStorageFolder(currentPath, folderName);
              setShowNewFolderModal(false);
              await refreshFiles();
            } catch (error) {
              console.error('Failed to create folder:', error);
              alert('Failed to create folder: ' + (error as Error).message);
            }
          }}
          currentPath={currentPath}
        />
      )}
      </>
      )}
    </div>
  );
}

// File Row Component
function FileRow({
  file,
  currentPath,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onFolderClick,
}: {
  file: FileItem;
  currentPath: string;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
  onFolderClick: (folderName: string) => void;
}) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (isMenuOpen && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isMenuOpen]);

  const menuContent = isMenuOpen && menuPosition ? (
    createPortal(
      <div
        data-menu
        style={{
          position: "fixed",
          top: menuPosition.top,
          right: menuPosition.right,
          backgroundColor: "var(--bgColor-default)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          zIndex: 9999,
          minWidth: "140px",
          overflow: "hidden",
        }}
      >
        <button
          onClick={async () => {
            onMenuToggle();
            try {
              const filePath = currentPath === '/' ? file.name : `${currentPath}/${file.name}`;
              await downloadStorageFile(filePath.replace(/^\//, ''));
            } catch (error) {
              console.error('Download failed:', error);
              alert('Download failed: ' + (error as Error).message);
            }
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 12px",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8125rem",
            color: "var(--fgColor-default)",
            textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bgColor-muted)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </button>
        <button
          onClick={onDelete}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 12px",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: "0.8125rem",
            color: "var(--fgColor-critical)",
            textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bgColor-muted)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 100px 160px 40px",
          gap: "12px",
          padding: "12px 20px",
          borderBottom: "1px solid var(--borderColor-muted)",
          alignItems: "center",
          transition: "background-color 0.1s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(11, 11, 11, 0.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
      {/* File Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "4px",
            backgroundColor: "var(--bgColor-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {file.type === "folder" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFolderClick(file.name);
              }}
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {/* Minimal folder icon - aligned with Lambda design */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--fgColor-info)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-9l-2-3H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
            </button>
          ) : (
            /* Minimal file icon - aligned with Lambda design */
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--fgColor-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          )}
        </div>
        {file.type === "folder" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFolderClick(file.name);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "transparent",
              border: "none",
              padding: "4px 8px",
              marginLeft: "-8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-info)",
              fontWeight: 500,
              transition: "all 0.15s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bgColor-muted)";
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            {file.name}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.6 }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </span>
        )}
      </div>

      {/* Type */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color: "var(--fgColor-muted)",
          textTransform: "capitalize",
        }}
      >
        {file.type === "folder" ? "Folder" : file.fileType?.toUpperCase() || "File"}
      </div>

      {/* Size */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color: "var(--fgColor-muted)",
        }}
      >
        {file.size ? formatSize(file.size) : "--"}
      </div>

      {/* Updated On */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color: "var(--fgColor-muted)",
        }}
      >
        {file.updatedAt}
      </div>

      {/* Menu */}
      <div style={{ position: "relative" }} data-menu>
        <button
          ref={menuButtonRef}
          onClick={onMenuToggle}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "4px",
            backgroundColor: isMenuOpen ? "var(--bgColor-muted)" : "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--fgColor-muted)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
      {menuContent}
      </div>
    </>
  );
}

// New Folder Modal Component
function NewFolderModal({
  onClose,
  onCreate,
  currentPath,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
  currentPath: string;
}) {
  const [folderName, setFolderName] = useState("");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 11, 11, 0.15)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--bgColor-default)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "8px",
          zIndex: 101,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--borderColor-default)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
            }}
          >
            New Folder
          </h2>
        </div>

        <div style={{ padding: "20px" }}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--fgColor-default)",
              marginBottom: "8px",
            }}
          >
            Folder name
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name"
            autoFocus
            style={{
              width: "100%",
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              color: "var(--fgColor-default)",
              backgroundColor: "transparent",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              padding: "0 12px",
              height: "40px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            padding: "16px 20px",
            borderTop: "1px solid var(--borderColor-default)",
            backgroundColor: "var(--bgColor-mild)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-default)",
              backgroundColor: "transparent",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "4px",
              padding: "0 16px",
              height: "36px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (folderName.trim()) {
                onCreate(folderName.trim());
              }
            }}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--fgColor-inverse)",
              backgroundColor: "var(--fgColor-default)",
              border: "1px solid var(--fgColor-default)",
              borderRadius: "4px",
              padding: "0 16px",
              height: "36px",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}

// Create Storage Modal Component
function CreateStorageModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (volume: StorageVolume) => void;
}) {
  const [name, setName] = useState("");
  const [sizeGb, setSizeGb] = useState(5);
  const [isDragging, setIsDragging] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameChecking, setNameChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debounced name validation
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNameChange = (newName: string) => {
    setName(newName);
    setNameError(null);

    // Clear previous timeout
    if (nameCheckTimeoutRef.current) {
      clearTimeout(nameCheckTimeoutRef.current);
    }

    // Validate format first (client-side)
    if (!newName.trim()) {
      setNameError(null);
      return;
    }

    const nameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!nameRegex.test(newName)) {
      setNameError('Name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    // Debounced API check
    setNameChecking(true);
    nameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await checkStorageName(newName);
        if (!result.available) {
          setNameError(result.error || 'This name is already taken');
        } else {
          setNameError(null);
        }
      } catch {
        // Silently fail - let server handle validation on submit
        setNameError(null);
      } finally {
        setNameChecking(false);
      }
    }, 500);
  };

  const handleSizeChange = (newSize: number) => {
    // Enforce minimum of 5GB
    setSizeGb(Math.max(5, Math.min(10, newSize)));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const formatSize = (gb: number) => {
    return `${gb} GB`;
  };

  const isValid =
    name.trim().length > 0 &&
    !nameError &&
    !nameChecking &&
    sizeGb >= 5 &&
    sizeGb <= 10;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const volume = await createStorageVolume(name.trim(), sizeGb);
      onSuccess(volume);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create storage');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (nameCheckTimeoutRef.current) {
        clearTimeout(nameCheckTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        onClick={onClose}
        onMouseUp={handleMouseUp}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(11, 11, 11, 0.15)",
          zIndex: 100,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--bgColor-default)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "8px",
          zIndex: 101,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--borderColor-default)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              margin: 0,
            }}
          >
            Create File Store
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "4px",
              backgroundColor: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--fgColor-muted)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div
            style={{
              backgroundColor: "var(--bgColor-warning-section)",
              border: "1px solid var(--borderColor-warning)",
              borderRadius: "4px",
              padding: "12px",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--fgColor-warning)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: "2px" }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                color: "var(--fgColor-default)",
                lineHeight: 1.5,
              }}
            >
              File Stores persist independently of compute instances. 
              Billed at ₹0.50/GB/month.
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                marginBottom: "8px",
              }}
            >
              Name
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter file store name"
                style={{
                  width: "100%",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  color: "var(--fgColor-default)",
                  backgroundColor: "transparent",
                  border: `1px solid ${
                    nameError
                      ? "var(--fgColor-critical)"
                      : nameChecking
                      ? "var(--borderColor-default)"
                      : "var(--borderColor-default)"
                  }`,
                  borderRadius: "4px",
                  padding: "0 12px",
                  height: "40px",
                  outline: "none",
                  boxSizing: "border-box",
                  opacity: nameChecking ? 0.7 : 1,
                }}
              />
              {nameChecking && (
                <div
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    border: "2px solid var(--borderColor-default)",
                    borderTopColor: "var(--fgColor-info)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
            </div>
            {nameError && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "var(--fgColor-critical)",
                  margin: "4px 0 0 0",
                }}
              >
                {nameError}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-sans)",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                marginBottom: "8px",
              }}
            >
              Size (5 GB - 10 GB)
            </label>
            
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                marginBottom: "16px",
              }}
            >
              {formatSize(sizeGb)}
            </div>

            <div
              style={{
                position: "relative",
                height: "40px",
                backgroundColor: "var(--bgColor-muted)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                // Map to 5-10 range instead of 1-10
                handleSizeChange(Math.round(percent * 5) + 5);
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${((sizeGb - 5) / 5) * 100}%`,
                  backgroundColor: "var(--fgColor-info)",
                  borderRadius: "4px",
                  transition: isDragging ? "none" : "width 0.1s ease",
                }}
              />
              
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${((sizeGb - 5) / 5) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                  backgroundColor: "var(--fgColor-inverse)",
                  border: "2px solid var(--fgColor-info)",
                  borderRadius: "50%",
                  cursor: "grab",
                  transition: isDragging ? "none" : "left 0.1s ease",
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown();
                }}
                onMouseUp={handleMouseUp}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  const slider = e.currentTarget.parentElement;
                  if (!slider) return;
                  const rect = slider.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = Math.max(0, Math.min(1, x / rect.width));
                  // Map to 5-10 range instead of 1-10
                  handleSizeChange(Math.round(percent * 5) + 5);
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0 8px",
                  pointerEvents: "none",
                }}
              >
                {[5, 6, 7, 8, 9, 10].map((n) => (
                  <div
                    key={n}
                    style={{
                      width: "2px",
                      height: "8px",
                      backgroundColor: "var(--borderColor-default)",
                      borderRadius: "1px",
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "var(--fgColor-muted)",
                }}
              >
                5 GB
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.75rem",
                  color: "var(--fgColor-muted)",
                }}
              >
                10 GB
              </span>
            </div>
          </div>

          {submitError && (
            <div
              style={{
                backgroundColor: "var(--bgColor-critical-section)",
                border: "1px solid var(--fgColor-critical)",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.8125rem",
                  color: "var(--fgColor-critical)",
                  margin: 0,
                }}
              >
                {submitError}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--fgColor-default)",
                backgroundColor: "transparent",
                border: "1px solid var(--borderColor-default)",
                borderRadius: "4px",
                padding: "0 20px",
                height: "40px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--fgColor-inverse)",
                backgroundColor: isValid && !isSubmitting
                  ? "var(--fgColor-default)"
                  : "var(--fgColor-muted)",
                border: `1px solid ${isValid && !isSubmitting
                  ? "var(--fgColor-default)"
                  : "var(--fgColor-muted)"}`,
                borderRadius: "4px",
                padding: "0 20px",
                height: "40px",
                cursor: isValid && !isSubmitting ? "pointer" : "not-allowed",
                transition: "opacity 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isSubmitting && (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid var(--fgColor-inverse)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
              {isSubmitting ? "Creating..." : "Create File Store"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
