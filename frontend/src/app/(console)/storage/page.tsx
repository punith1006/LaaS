"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Storage types
interface StorageVolume {
  id: string;
  name: string;
  sizeGb: number;
  usedGb: number;
  status: "active" | "available" | "allocated";
  createdAt: string;
  zfsDatasetPath: string;
}

// File types
interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  fileType?: string;
  size?: number;
  updatedAt: string;
  parentId?: string | null;
}

// Mock data - will be replaced with API data
const mockStorages: StorageVolume[] = [
  {
    id: "1",
    name: "project-data",
    sizeGb: 5,
    usedGb: 2.3,
    status: "active",
    createdAt: "2026-03-10",
    zfsDatasetPath: "pool01/user_volumes/user_123/project-data",
  },
];

// Mock file data
const mockFiles: FileItem[] = [
  { id: "1", name: "datasets", type: "folder", updatedAt: "03/20/2026 10:30:00", parentId: null },
  { id: "2", name: "models", type: "folder", updatedAt: "03/19/2026 14:22:00", parentId: null },
  { id: "3", name: "tailscale-setup-1.94.2.exe", type: "file", fileType: "exe", size: 1402678, updatedAt: "03/20/2026 10:56:14", parentId: null },
  { id: "4", name: "training-data.csv", type: "file", fileType: "csv", size: 2456789, updatedAt: "03/18/2026 09:15:00", parentId: null },
  { id: "5", name: "notebook.ipynb", type: "file", fileType: "ipynb", size: 45632, updatedAt: "03/17/2026 16:45:00", parentId: null },
  // Nested content for datasets folder
  { id: "6", name: "images", type: "folder", updatedAt: "03/20/2026 10:25:00", parentId: "1" },
  { id: "7", name: "raw-data.csv", type: "file", fileType: "csv", size: 567890, updatedAt: "03/20/2026 10:20:00", parentId: "1" },
  // Nested content for models folder
  { id: "8", name: "v1", type: "folder", updatedAt: "03/19/2026 14:00:00", parentId: "2" },
  { id: "9", name: "model-config.json", type: "file", fileType: "json", size: 1234, updatedAt: "03/19/2026 13:50:00", parentId: "2" },
  // Nested content for datasets/images folder
  { id: "10", name: "sample.jpg", type: "file", fileType: "jpg", size: 234567, updatedAt: "03/20/2026 10:24:00", parentId: "6" },
  // Nested content for models/v1 folder
  { id: "11", name: "weights.bin", type: "file", fileType: "bin", size: 12345678, updatedAt: "03/19/2026 13:55:00", parentId: "8" },
];

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
  const [storages] = useState<StorageVolume[]>(mockStorages);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<{ id: string; name: string }[]>([]);

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

  // Calculate totals
  const totalAllocated = storages.reduce((sum, s) => sum + s.sizeGb, 0);
  const totalUsed = storages.reduce((sum, s) => sum + s.usedGb, 0);
  const usagePercent = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

  // Filter files based on tab, search, and current folder
  const filteredFiles = files.filter((file) => {
    // Folder navigation filter
    if (file.parentId !== currentFolderId) {
      return false;
    }
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

  // Navigation functions
  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setPathHistory([...pathHistory, { id: folderId, name: folderName }]);
    setOpenMenuId(null);
  };

  const navigateBack = () => {
    if (pathHistory.length > 0) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousFolder = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentFolderId(previousFolder ? previousFolder.id : null);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setPathHistory([]);
    } else {
      const newHistory = pathHistory.slice(0, index + 1);
      setPathHistory(newHistory);
      setCurrentFolderId(newHistory[newHistory.length - 1].id);
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
                  cursor: "pointer",
                }}
              >
                Delete Existing
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

      {/* Storage Usage Card */}
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
              onClick={() => {/* Refresh files */}}
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

            {/* Upload Files Button */}
            <button
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
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
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
                <div key={folder.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
                isMenuOpen={openMenuId === file.id}
                onMenuToggle={() => setOpenMenuId(openMenuId === file.id ? null : file.id)}
                onDelete={() => {
                  setFiles(files.filter((f) => f.id !== file.id));
                  setOpenMenuId(null);
                }}
                onFolderClick={navigateToFolder}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Storage Modal */}
      {isCreateModalOpen && (
        <CreateStorageModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewFolderModal
          onClose={() => setShowNewFolderModal(false)}
          onCreate={(name, parentId) => {
            const newFolder: FileItem = {
              id: Date.now().toString(),
              name,
              type: "folder",
              updatedAt: new Date().toLocaleString(),
              parentId: parentId,
            };
            setFiles([newFolder, ...files]);
            setShowNewFolderModal(false);
          }}
          currentFolderId={currentFolderId}
        />
      )}
    </div>
  );
}

// File Row Component
function FileRow({
  file,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onFolderClick,
}: {
  file: FileItem;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
  onFolderClick: (folderId: string, folderName: string) => void;
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
          onClick={() => {
            // Download action
            onMenuToggle();
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
                onFolderClick(file.id, file.name);
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
              onFolderClick(file.id, file.name);
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
  currentFolderId,
}: {
  onClose: () => void;
  onCreate: (name: string, parentId: string | null) => void;
  currentFolderId: string | null;
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
                onCreate(folderName.trim(), currentFolderId);
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
function CreateStorageModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [sizeGb, setSizeGb] = useState(5);
  const [isDragging, setIsDragging] = useState(false);

  const handleSizeChange = (newSize: number) => {
    setSizeGb(Math.max(1, Math.min(10, newSize)));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const formatSize = (gb: number) => {
    if (gb === 1) return "1 GB";
    return `${gb} GB`;
  };

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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter file store name"
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
              Size
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
                handleSizeChange(Math.round(percent * 10));
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(sizeGb / 10) * 100}%`,
                  backgroundColor: "var(--fgColor-info)",
                  borderRadius: "4px",
                  transition: isDragging ? "none" : "width 0.1s ease",
                }}
              />
              
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${(sizeGb / 10) * 100}%`,
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
                  handleSizeChange(Math.round(percent * 10));
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
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
                1 GB
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

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
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
                padding: "0 20px",
                height: "40px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
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
          </div>
        </div>
      </div>
    </>
  );
}
