import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LinkedinLogo } from "@phosphor-icons/react";
import { toast } from "react-toastify";
import {
  deleteLinkedInPost,
  getLinkedInHistory,
  listLinkedInPosts,
  publishLinkedInPost,
  restoreLinkedInPost,
  retryLinkedInPost,
  syncLinkedInHistory,
  verifyLinkedInOrganization,
} from "../../services/linkedin/handleLinkedIn";
import type { LinkedInPostStatus, LinkedInSourceType } from "../../types/LinkedIn";
import { apiErrorMessage } from "../../types/Api";
import { PageHeader, EmptyState, ConfirmDialog } from "../../shared/ui";
import LinkedInTableToolbar from "./components/LinkedInTableToolbar";
import LinkedInTableRow from "./components/LinkedInTableRow";
import LinkedInPagination from "./components/LinkedInPagination";
import LinkedInHistoryDrawer from "./components/LinkedInHistoryDrawer";

// Manage standalone LinkedIn post table, channel synchronization, and direct row execution.
const LinkedInManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<LinkedInPostStatus | "">("");
  const [sourceType, setSourceType] = useState<LinkedInSourceType | "">("");
  const [showHistory, setShowHistory] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const posts = useQuery({
    queryKey: ["linkedin-posts", { page, pageSize, status, sourceType }],
    queryFn: () =>
      listLinkedInPosts({
        page,
        pageSize,
        ...(status ? { status } : {}),
        ...(sourceType ? { sourceType } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const totalPages = Math.max(1, posts.data?.totalPages ?? 1);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const history = useQuery({
    queryKey: ["linkedin-history", 10],
    queryFn: () => getLinkedInHistory(10),
    enabled: showHistory,
    retry: false,
  });

  const publish = useMutation({
    mutationFn: (id: string) => publishLinkedInPost(id),
    onSuccess: () => {
      toast.success("Đã kích hoạt xuất bản bài đăng LinkedIn.");
      client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryLinkedInPost(id),
    onSuccess: () => {
      toast.success("Đang thử lại xuất bản bài đăng LinkedIn.");
      client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const restore = useMutation({
    mutationFn: restoreLinkedInPost,
    onSuccess: () => {
      toast.success("Đã khôi phục bài LinkedIn.");
      client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: deleteLinkedInPost,
    onSuccess: (_, id) => {
      toast.success(
        <span>
          Đã xóa bài khỏi CMS.{" "}
          <button
            type="button"
            onClick={() => restore.mutate(id)}
            className="underline font-semibold ml-1 text-primary-green hover:opacity-80"
          >
            Hoàn tác
          </button>
        </span>
      );
      setDeleteTargetId(null);
      client.invalidateQueries({ queryKey: ["linkedin-posts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const sync = useMutation({
    mutationFn: syncLinkedInHistory,
    onSuccess: () => {
      toast.success("Đã đồng bộ lịch sử LinkedIn.");
      client.invalidateQueries({ queryKey: ["linkedin-history"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const verify = useMutation({
    mutationFn: verifyLinkedInOrganization,
    onSuccess: (result) => setVerified(result.readyForOrganicPosting),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handleResetFilters = () => {
    setStatus("");
    setSourceType("");
    setPage(1);
  };

  return (
    <section>
      <PageHeader
        title="Quản lý LinkedIn"
        description="Quản lý bài đăng LinkedIn độc lập. Bài chuyển từ blog được tạo trong mục Xuất bản bài viết."
        actions={
          <Link to="/linkedin/new" title="Tạo bài LinkedIn" className="btn btn-li btn-lg">
            <Plus size={16} weight="light" />
            <span>Tạo bài LinkedIn</span>
          </Link>
        }
      />

      <LinkedInTableToolbar
        status={status}
        onStatusChange={(s) => { setStatus(s); setPage(1); }}
        sourceType={sourceType}
        onSourceTypeChange={(st) => { setSourceType(st); setPage(1); }}
        onResetFilters={handleResetFilters}
        onVerify={() => verify.mutate()}
        isVerifying={verify.isPending}
        verified={verified}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      <LinkedInHistoryDrawer
        showHistory={showHistory}
        historyData={history.data}
        isLoading={history.isLoading}
        isError={history.isError}
        errorMessage={apiErrorMessage(history.error)}
        onSync={() => sync.mutate()}
        isSyncing={sync.isPending}
      />

      <section className="panel overflow-hidden">
        {posts.isLoading ? (
          <div className="py-16 text-center text-sm text-content-muted">
            Đang tải danh sách bài đăng LinkedIn...
          </div>
        ) : posts.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(posts.error)}
          </div>
        ) : (posts.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<LinkedinLogo weight="light" size={24} />}
            title="Chưa có bài LinkedIn độc lập"
            description="Tạo bài viết LinkedIn mới từ công cụ AI hoặc nhập nội dung thủ công để xuất bản."
          />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_6rem_12.5rem] gap-4 border-b border-surface-border bg-surface-elevated/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-content-muted lg:grid">
              <span>Nội dung</span>
              <span>Nguồn</span>
              <span>Trạng thái</span>
              <span>Cập nhật</span>
              <span className="text-right">Thao tác</span>
            </div>
            <ul className="divide-y divide-surface-border">
              {posts.data?.items.map((post, index) => (
                <LinkedInTableRow
                  key={post.id}
                  post={post}
                  index={index}
                  onPublish={(id) => publish.mutate(id)}
                  onRetry={(id) => retry.mutate(id)}
                  onDelete={(id) => setDeleteTargetId(id)}
                  isPublishing={publish.isPending}
                  isRetrying={retry.isPending}
                />
              ))}
            </ul>

            <LinkedInPagination
              page={posts.data?.page ?? page}
              totalPages={posts.data?.totalPages ?? 1}
              totalItems={posts.data?.total}
              pageSize={pageSize}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xác nhận xóa bài khỏi CMS"
        message="Thao tác này chỉ xóa bản ghi khỏi CMS nội bộ và không xóa bài đã xuất bản thực tế trên LinkedIn."
        confirmLabel="Xóa khỏi CMS"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={() => deleteTargetId && remove.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
};

export default LinkedInManagement;
