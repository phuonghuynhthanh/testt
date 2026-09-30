import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus, FiExternalLink, FiTrash2, FiRefreshCw, FiCheckCircle, FiClock } from "react-icons/fi";
import { FaLinkedin } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  deleteLinkedInPost,
  getLinkedInHistory,
  listLinkedInPosts,
  restoreLinkedInPost,
  syncLinkedInHistory,
  verifyLinkedInOrganization,
} from "../../services/linkedin/handleLinkedIn";
import type { LinkedInPostStatus, LinkedInSourceType } from "../../types/LinkedIn";
import { apiErrorMessage } from "../../types/Api";
import { formatCmsDate } from "../../utils/date";
import {
  StatusBadge,
  PageHeader,
  EmptyState,
  ConfirmDialog,
  Pagination,
} from "../../shared/ui";

const STATUS_OPTIONS: Array<{ value: LinkedInPostStatus; label: string }> = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "READY", label: "Sẵn sàng" },
  { value: "PUBLISHING", label: "Đang đăng" },
  { value: "PUBLISHED", label: "Đã đăng" },
  { value: "FAILED", label: "Thất bại" },
  { value: "REVIEW_REQUIRED", label: "Cần xem xét" },
];

const SOURCE_OPTIONS: Array<{ value: LinkedInSourceType; label: string }> = [
  { value: "INDEPENDENT_AI", label: "AI Độc lập" },
  { value: "BLOG_ADAPTATION", label: "Chuyển từ Blog" },
  { value: "CUSTOM", label: "Thủ công" },
];

// Manage independent LinkedIn posts, connection verification, and historical audit entries.
const LinkedInManagement: React.FC = () => {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LinkedInPostStatus | "">("");
  const [sourceType, setSourceType] = useState<LinkedInSourceType | "">("");
  const [showHistory, setShowHistory] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const posts = useQuery({
    queryKey: ["linkedin-posts", { page, pageSize: 20, status, sourceType }],
    queryFn: () =>
      listLinkedInPosts({
        page,
        pageSize: 20,
        ...(status ? { status } : {}),
        ...(sourceType ? { sourceType } : {})
      }),
  });

  const history = useQuery({
    queryKey: ["linkedin-history", 10],
    queryFn: () => getLinkedInHistory(10),
    enabled: showHistory,
    retry: false,
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

  // Execute confirmed deletion of the target LinkedIn post record.
  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      remove.mutate(deleteTargetId);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Quản lý LinkedIn"
        description="Quản lý bài đăng LinkedIn độc lập; bài chuyển từ Blog được quản lý trực tiếp trong màn hình Blog"
        actions={
          <Link
            to="/linkedin/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0a66c2] hover:bg-[#084e96] text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Tạo bài LinkedIn</span>
          </Link>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card p-4 rounded-xl border border-surface-border">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as LinkedInPostStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value as LinkedInSourceType | "");
              setPage(1);
            }}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-primary-green"
          >
            <option value="">Tất cả nguồn</option>
            {SOURCE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-content-primary transition-colors disabled:opacity-50"
          >
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{verify.isPending ? "Đang kiểm tra…" : "Kiểm tra kết nối"}</span>
          </button>

          {verified !== null && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${
                verified
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-950/40 text-amber-400 border-amber-500/30"
              }`}
            >
              {verified ? "Sẵn sàng đăng bài" : "Chưa sẵn sàng đăng bài"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showHistory
                ? "bg-surface-elevated text-primary-green border-primary-green/40"
                : "border-surface-border bg-surface-elevated hover:bg-surface-hover text-content-secondary"
            }`}
          >
            <FiClock className="w-3.5 h-3.5" />
            <span>Lịch sử Live</span>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="bg-surface-card rounded-xl border border-surface-border p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <h3 className="font-semibold text-content-primary text-sm flex items-center gap-2">
              <FaLinkedin className="text-[#0a66c2]" />
              <span>Lịch sử Company Page</span>
            </h3>
            <button
              type="button"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-surface-elevated hover:bg-surface-hover text-cyan-400 border border-surface-border transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3 h-3 ${sync.isPending ? "animate-spin" : ""}`} />
              <span>{sync.isPending ? "Đang đồng bộ…" : "Đồng bộ ngay"}</span>
            </button>
          </div>

          {history.isError ? (
            <p className="text-xs text-amber-400 bg-amber-950/20 p-3 rounded-lg border border-amber-500/20">
              Không thể tải lịch sử nhà cung cấp: {apiErrorMessage(history.error)}
            </p>
          ) : (history.data?.items.length ?? 0) === 0 ? (
            <p className="text-xs text-content-muted py-2 text-center">
              Chưa có dữ liệu lịch sử bài đăng nào.
            </p>
          ) : (
            <div className="space-y-3">
              {history.data?.items.map((item) => (
                <article
                  key={item.providerPostId}
                  className="bg-surface-elevated/50 p-3.5 rounded-lg border border-surface-border/60 text-xs space-y-1.5"
                >
                  <strong className="text-content-primary text-sm font-medium block">
                    {item.topic}
                  </strong>
                  <p className="text-content-secondary line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>
                  {item.publishedAt && (
                    <span className="text-[11px] text-content-muted block">
                      Đăng lúc: {formatCmsDate(item.publishedAt)}
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden shadow-sm">
        {posts.isLoading ? (
          <div className="py-20 text-center text-sm text-content-muted">
            Đang tải danh sách bài đăng LinkedIn...
          </div>
        ) : posts.isError ? (
          <div className="py-12 text-center text-sm text-rose-400">
            {apiErrorMessage(posts.error)}
          </div>
        ) : (posts.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<FaLinkedin className="w-6 h-6 text-[#0a66c2]" />}
            title="Chưa có bài LinkedIn độc lập"
            description="Tạo bài viết LinkedIn mới từ công cụ AI hoặc nhập nội dung thủ công để xuất bản."
            action={
              <Link
                to="/linkedin/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0a66c2] text-white hover:bg-[#084e96] transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                <span>Tạo bài đầu tiên</span>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-elevated text-xs font-semibold uppercase tracking-wider text-content-muted border-b border-surface-border">
                  <tr>
                    <th className="py-3 px-4">Chủ đề bài viết</th>
                    <th className="py-3 px-4">Nguồn gốc</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Cập nhật</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {posts.data?.items.map((post) => (
                    <tr
                      key={post.id}
                      className="hover:bg-surface-hover/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-content-primary max-w-xs truncate">
                        {post.topic}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={post.sourceType} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-content-muted whitespace-nowrap">
                        {formatCmsDate(post.modifiedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/linkedin/posts/${post.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-800/40 transition-colors"
                          >
                            <FiExternalLink className="w-3.5 h-3.5" />
                            <span>Mở</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(post.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-800/40 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            <span>Xóa CMS</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-surface-border px-4 bg-surface-card">
              <Pagination
                page={posts.data?.page ?? page}
                totalPages={posts.data?.totalPages ?? 1}
                itemUnit="bài viết"
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xác nhận xóa bài khỏi CMS"
        message="Thao tác này chỉ xóa bản ghi khỏi CMS nội bộ và không xóa bài đã xuất bản thực tế trên LinkedIn."
        confirmLabel="Xóa khỏi CMS"
        cancelLabel="Hủy"
        variant="danger"
        isLoading={remove.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </section>
  );
};

export default LinkedInManagement;
