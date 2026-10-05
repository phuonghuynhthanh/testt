import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowSquareOut, CaretDown, CaretUp, Check, PencilSimple, Trash, X, XCircle } from "@phosphor-icons/react";
import { getBlogDetail } from "../../../../services/blog/handleBlog";
import type { BlogState } from "../../../../types/Blog";
import { formatCmsDate } from "../../../../utils/date";
import { BlogThumbnail, StatusBadge } from "../../../../shared/ui";
import MarkdownContent from "../../../../shared/markdown/MarkdownContent";

interface BlogDetailDrawerProps {
  blogId: string | null;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (delta: number) => void;
  onSetState: (id: string, state: BlogState) => void;
  onDelete: (id: string) => void;
}

// Render the SEO character counter, warning when over the recommended length.
const Length: React.FC<{ value?: string; max: number }> = ({ value, max }) => {
  const n = (value || "").length;
  return (
    <span className={`len mono${n > max ? " warn" : ""}`}>
      {n}/{max} ký tự{n > max ? " · quá dài" : ""}
    </span>
  );
};

// Render the slide-over quick view of one blog using a native dialog for focus trap and Esc.
export const BlogDetailDrawer: React.FC<BlogDetailDrawerProps> = ({
  blogId,
  position,
  total,
  onClose,
  onStep,
  onSetState,
  onDelete,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const detail = useQuery({
    queryKey: ["blogs", "detail", blogId],
    queryFn: () => getBlogDetail(blogId!),
    enabled: Boolean(blogId),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (blogId && !dialog.open) dialog.showModal();
    if (!blogId && dialog.open) dialog.close();
  }, [blogId]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [blogId]);

  // Animate the slide-out before closing the native dialog.
  const closeWithAnimation = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.classList.add("closing");
    window.setTimeout(() => {
      dialog.close();
      dialog.classList.remove("closing");
    }, 150);
  };

  const blog = detail.data;
  const seo = blog?.seo;
  const tags = (blog?.tag || "").split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <dialog
      ref={dialogRef}
      className="drawer"
      aria-labelledby="d-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        closeWithAnimation();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeWithAnimation();
      }}
    >
      {blogId && (
        <>
          <div className="d-head">
            {blog?.state && <StatusBadge status={blog.state} variant="state" />}
            <span className="pos mono" aria-live="polite">
              {position >= 0 ? `${position + 1} / ${total}` : ""}
            </span>
            <button type="button" className="ib" aria-label="Bài trước" disabled={position <= 0} onClick={() => onStep(-1)}>
              <CaretUp size={18} weight="light" />
            </button>
            <button type="button" className="ib" aria-label="Bài sau" disabled={position < 0 || position >= total - 1} onClick={() => onStep(1)}>
              <CaretDown size={18} weight="light" />
            </button>
            <button type="button" className="ib" aria-label="Đóng chi tiết" autoFocus onClick={closeWithAnimation}>
              <X size={18} weight="light" />
            </button>
          </div>

          <div className="d-body" ref={bodyRef}>
            {detail.isLoading || !blog ? (
              <p className="py-10 text-center text-xs text-content-muted">
                {detail.isError ? "Không thể tải bài viết." : "Đang tải chi tiết bài viết..."}
              </p>
            ) : (
              <>
                <BlogThumbnail bannerUrl={blog.banner_url} title={blog.title} size="lg" />
                <h2 id="d-title">{blog.title}</h2>
                <dl className="meta">
                  <dt>Danh mục</dt>
                  <dd>{blog.category || "Chưa phân loại"}</dd>
                  <dt>Slug</dt>
                  <dd className="mono">/{(blog.link_post || "").replace(/^\/+/, "")}</dd>
                  <dt>Tag</dt>
                  <dd>
                    <span className="tags">
                      {tags.length ? tags.map((t) => <span key={t} className="tag">{t}</span>) : "—"}
                    </span>
                  </dd>
                  <dt>Tác giả</dt>
                  <dd>{seo?.author || "—"}</dd>
                  <dt>Tạo lúc</dt>
                  <dd className="mono">{blog.created_at ? formatCmsDate(blog.created_at) : "—"}</dd>
                  <dt>Cập nhật</dt>
                  <dd className="mono">{blog.modified_at ? formatCmsDate(blog.modified_at) : "—"}</dd>
                </dl>
                <div>
                  <h3 className="sec-t">SEO</h3>
                  <div className="seo">
                    <div>
                      <div>{seo?.title || "—"}</div>
                      <Length value={seo?.title} max={60} />
                    </div>
                    <div>
                      <div>{seo?.description || "—"}</div>
                      <Length value={seo?.description} max={160} />
                    </div>
                    <div className="tags">
                      {(seo?.keywords || []).map((k) => <span key={k} className="tag">{k}</span>)}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="sec-t">Nội dung</h3>
                  <MarkdownContent content={blog.content || "Bài viết chưa có nội dung văn bản."} />
                </div>
              </>
            )}
          </div>

          <div className="d-foot">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={!blog || blog.state === "APPROVED"}
              onClick={() => blog && onSetState(blogId, "APPROVED")}
            >
              <Check size={16} weight="light" />
              Duyệt
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              disabled={!blog || blog.state === "REJECTED"}
              onClick={() => blog && onSetState(blogId, "REJECTED")}
            >
              <XCircle size={16} weight="light" />
              Từ chối
            </button>
            <Link to={`/blog/default/${blogId}`} className="btn btn-ghost btn-lg">
              <PencilSimple size={16} weight="light" />
              Sửa
            </Link>
            <Link to={`/blog/detail/${blogId}`} className="btn btn-ghost btn-lg">
              <ArrowSquareOut size={16} weight="light" />
              Trang chi tiết
            </Link>
            <span className="sp" />
            <button type="button" className="btn btn-danger btn-lg" onClick={() => onDelete(blogId)}>
              <Trash size={16} weight="light" />
              Xóa
            </button>
          </div>
        </>
      )}
    </dialog>
  );
};

export default BlogDetailDrawer;
