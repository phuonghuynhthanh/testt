import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  generateLinkedInDraft,
  getPublication,
  publishBlog,
  retryLinkedIn,
  saveLinkedInPublication,
  suggestLinkedInMedia,
  updatePublication,
  verifyLinkedInOrganization,
} from "../../../services/publication/handlePublication";
import {
  isManualDraftConflict,
  publicationErrorMessage,
} from "../../../services/publication/error";
import type {
  LinkedInMediaMode,
  LinkedInMode,
  OrganizationVerification,
  PexelsCandidate,
  Publication,
} from "../../../types/Publication";

interface PublicationPanelProps {
  blogId: string;
  blogSaveVersion: number;
  blogState?: string;
  linkedinWorkspace?: boolean;
}

// Identify selected Pexels media without mistaking generated image-plan entries for candidates.
const isPexelsCandidate = (
  media: Publication["linkedinMedia"][number],
): media is PexelsCandidate => "providerId" in media;

// Compare only editable media fields so server refreshes do not create false dirty states.
const mediaSignature = (items: PexelsCandidate[]): string =>
  JSON.stringify(
    items.map(({ providerId, altText, order }) => ({ providerId, altText, order })),
  );

// Enforce the exact image count represented by the backend media mode.
const hasValidMediaCount = (mode: LinkedInMediaMode, count: number): boolean =>
  mode === "none"
    ? count === 0
    : mode === "single-image"
      ? count === 1
      : count >= 2 && count <= 20;

// Read a useful string from provider data without depending on undocumented optional keys.
const readProviderText = (
  value: Record<string, unknown>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key]) return String(value[key]);
  }
  return null;
};

// Keep every backend publication status distinct in the administrator UI.
const statusCopy: Record<Publication["linkedinStatus"], string> = {
  NOT_SELECTED: "LinkedIn is not selected.",
  DRAFT: "Draft needs content before publishing.",
  READY: "Ready for your final review.",
  PUBLISHING: "A publish operation is in progress.",
  PUBLISHED: "Published.",
  FAILED: "Publishing failed; retry may be available.",
  REVIEW_REQUIRED: "Outcome may be ambiguous; inspect the Company Page.",
};

// Provide the review-first workflow in either the Blog editor or LinkedIn workspace.
const PublicationPanel = ({
  blogId,
  blogSaveVersion,
  blogState,
  linkedinWorkspace = false,
}: PublicationPanelProps) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<LinkedInMode>("SAME");
  const [publishWeb, setPublishWeb] = useState(true);
  const [publishLinkedin, setPublishLinkedin] = useState(false);
  const [includeWebLink, setIncludeWebLink] = useState(false);
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState<PexelsCandidate[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<PexelsCandidate[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [verification, setVerification] = useState<OrganizationVerification | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [draftStale, setDraftStale] = useState(false);
  const previousBlogSaveVersion = useRef(blogSaveVersion);

  const publicationQuery = useQuery({
    queryKey: ["publication", blogId],
    queryFn: () => getPublication(blogId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const publication = publicationQuery.data;
  const savedMedia = useMemo(
    () => publication?.linkedinMedia.filter(isPexelsCandidate) ?? [],
    [publication],
  );
  const effectiveIncludeWebLink = publishWeb && publishLinkedin && includeWebLink;
  const settingsDirty = Boolean(
    publication &&
      (publishWeb !== publication.publishWeb ||
        publishLinkedin !== publication.publishLinkedin ||
        mode !== publication.linkedinMode ||
        effectiveIncludeWebLink !== publication.linkedinIncludeWebLink),
  );
  const contentDirty = Boolean(
    publication && content !== (publication.linkedinContent ?? ""),
  );
  const mediaDirty = mediaSignature(selectedMedia) !== mediaSignature(savedMedia);
  const hasUnsavedChanges = settingsDirty || contentDirty || mediaDirty;

  // Mirror server state into editable controls after each successful mutation.
  useEffect(() => {
    if (!publication) return;
    setMode(publication.linkedinMode);
    setPublishWeb(publication.publishWeb);
    setPublishLinkedin(publication.publishLinkedin);
    setIncludeWebLink(publication.linkedinIncludeWebLink);
    setContent(publication.linkedinContent || "");
    setSelectedMedia(publication.linkedinMedia.filter(isPexelsCandidate));
  }, [publication]);

  // Mark generated copy stale only after this screen successfully saves the Blog.
  useEffect(() => {
    if (
      blogSaveVersion > previousBlogSaveVersion.current &&
      publication?.linkedinContent &&
      ["SAME", "SUMMARY"].includes(publication.linkedinMode)
    ) {
      setDraftStale(true);
    }
    previousBlogSaveVersion.current = blogSaveVersion;
  }, [blogSaveVersion, publication]);

  // Warn before the browser discards local publication edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Ask the browser to protect locally edited publication data.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Refresh publication and every Blog list cache affected by publishing.
  const refreshPublication = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["publication", blogId] }),
      queryClient.invalidateQueries({ queryKey: ["blogDetail", blogId] }),
      queryClient.invalidateQueries({ queryKey: ["blogs"] }),
    ]);
  };

  const settingsMutation = useMutation({
    mutationFn: () =>
      updatePublication(blogId, {
        publishWeb,
        publishLinkedin,
        linkedinMode: mode,
        linkedinIncludeWebLink: effectiveIncludeWebLink,
      }),
    onSuccess: async () => {
      toast.success("Publication settings saved.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const draftMutation = useMutation({
    mutationFn: (regenerate: boolean) =>
      generateLinkedInDraft(blogId, {
        mode: mode as Exclude<LinkedInMode, "CUSTOM">,
        includeWebLink: effectiveIncludeWebLink,
        regenerate,
      }),
    onSuccess: async () => {
      setDraftStale(false);
      toast.success("LinkedIn draft generated for review.");
      await refreshPublication();
    },
    onError: (error, regenerate) => {
      if (!regenerate && isManualDraftConflict(error)) {
        const approved = window.confirm(
          "This draft contains manual edits. Regenerating will replace them.",
        );
        if (approved) draftMutation.mutate(true);
        return;
      }
      toast.error(publicationErrorMessage(error));
    },
  });
  const saveDraftMutation = useMutation({
    mutationFn: () => saveLinkedInPublication(blogId, { content }),
    onSuccess: async () => {
      toast.success("LinkedIn draft saved.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const suggestionsMutation = useMutation({
    mutationFn: (keywords?: string[]) =>
      suggestLinkedInMedia(blogId, keywords?.length ? { keywords } : {}),
    onSuccess: (items) => setSuggestions(items),
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const mediaMutation = useMutation({
    mutationFn: () => saveLinkedInPublication(blogId, { media: selectedMedia }),
    onSuccess: async () => {
      toast.success("Selected media saved.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const publishMutation = useMutation({
    mutationFn: () => publishBlog(blogId),
    onSuccess: async () => {
      setShowConfirmation(false);
      toast.success("Publication request completed.");
      await refreshPublication();
    },
    onError: async (error) => {
      setShowConfirmation(false);
      toast.error(publicationErrorMessage(error));
      await refreshPublication();
    },
  });
  const retryMutation = useMutation({
    mutationFn: () => retryLinkedIn(blogId),
    onSuccess: async () => {
      toast.success("LinkedIn retry completed.");
      await refreshPublication();
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });
  const verifyMutation = useMutation({
    mutationFn: verifyLinkedInOrganization,
    onSuccess: (result) => {
      setVerification(result);
      toast[result.readyForOrganicPosting ? "success" : "warning"](
        result.readyForOrganicPosting
          ? "LinkedIn organization is ready for posting."
          : "LinkedIn organization is not ready for posting.",
      );
    },
    onError: (error) => toast.error(publicationErrorMessage(error)),
  });

  // Enforce the at-least-one-channel constraint and protect local edits.
  const toggleChannel = (channel: "web" | "linkedin") => {
    if (channel === "web") {
      if (publishWeb && !publishLinkedin) return;
      setPublishWeb(!publishWeb);
      if (publishWeb) setIncludeWebLink(false);
      return;
    }
    if (publishLinkedin && !publishWeb) return;
    if (
      publishLinkedin &&
      (contentDirty || mediaDirty) &&
      !window.confirm("Disable LinkedIn and discard its unsaved local edits?")
    ) {
      return;
    }
    setPublishLinkedin(!publishLinkedin);
    if (publishLinkedin) setIncludeWebLink(false);
  };

  // Protect draft work before changing a mode that clears persisted generation data.
  const changeMode = (nextMode: LinkedInMode) => {
    if (nextMode === mode) return;
    if (
      (content || selectedMedia.length > 0) &&
      !window.confirm(
        "Changing mode and saving settings will clear the current LinkedIn draft and media. Continue?",
      )
    ) {
      return;
    }
    setMode(nextMode);
  };

  // Select candidates in deterministic order without exceeding provider limits.
  const toggleMedia = (candidate: PexelsCandidate) => {
    const exists = selectedMedia.some((item) => item.providerId === candidate.providerId);
    const next = exists
      ? selectedMedia.filter((item) => item.providerId !== candidate.providerId)
      : [...selectedMedia, candidate];
    const maximum = publication?.linkedinMediaMode === "single-image" ? 1 : 20;
    setSelectedMedia(
      next.slice(0, maximum).map((item, index) => ({ ...item, order: index + 1 })),
    );
  };

  // Keep reviewed alt text synchronized with a selected candidate.
  const updateAltText = (providerId: string, altText: string) => {
    const update = (item: PexelsCandidate) =>
      item.providerId === providerId ? { ...item, altText } : item;
    setSuggestions((items) => items.map(update));
    setSelectedMedia((items) => items.map(update));
  };

  // Request a safe initial generation and let the backend identify manual-edit conflicts.
  const generateDraft = () => {
    if (mode === "CUSTOM" || settingsDirty) return;
    if (contentDirty && !window.confirm("Unsaved LinkedIn edits will be replaced. Continue?")) {
      return;
    }
    draftMutation.mutate(false);
  };

  // Convert optional comma or newline-separated phrases into backend keywords.
  const searchMedia = () => {
    const keywords = keywordInput
      .split(/[\n,]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    suggestionsMutation.mutate(keywords);
  };

  if (publicationQuery.isLoading) {
    return <div className="my-10 text-gray-300">Loading publication settings…</div>;
  }
  if (publicationQuery.isError || !publication) {
    return <div className="my-10 text-red-300">Unable to load publication settings.</div>;
  }

  const mediaCountValid = hasValidMediaCount(
    publication.linkedinMediaMode,
    selectedMedia.length,
  );
  const savedMediaValid = hasValidMediaCount(
    publication.linkedinMediaMode,
    savedMedia.length,
  );
  const altTextValid = selectedMedia.every((item) => item.altText.trim());
  const publishLabel = publishWeb && publishLinkedin
    ? "Publish"
    : publishWeb
      ? "Publish Website"
      : "Publish LinkedIn";
  const isPublished = publication.linkedinStatus === "PUBLISHED";
  const websitePublished = publishWeb && blogState === "APPROVED";
  const canStartPublish =
    !publishLinkedin ||
    ["NOT_SELECTED", "DRAFT", "READY"].includes(publication.linkedinStatus);
  const publishBlocked =
    hasUnsavedChanges ||
    (publishLinkedin && (!publication.linkedinContent?.trim() || !savedMediaValid));
  const organizationName = verification
    ? readProviderText(verification.organization, ["localizedName", "name", "vanityName", "id"])
    : null;
  const displayedCandidates = [
    ...selectedMedia,
    ...suggestions.filter(
      (candidate) =>
        !selectedMedia.some((item) => item.providerId === candidate.providerId),
    ),
  ];
  const modeDescription = {
    SAME: "Keep the article's main content and adapt its formatting for LinkedIn.",
    SUMMARY: "Generate a shorter LinkedIn-native version from the full article.",
    CUSTOM: "Write and review the LinkedIn post manually.",
  }[mode];

  return (
    <section className="my-10 border-t border-primary-blue-lighter pt-8">
      <h2 className="text-xl font-bold text-primary-white">
        {linkedinWorkspace ? "LinkedIn Post" : "Publication &amp; Distribution"}
      </h2>
      <div className="mt-5 space-y-5 rounded-lg bg-primary-black-light p-5">
        <div>
          <h3 className="font-semibold text-primary-white">
            {linkedinWorkspace ? "LinkedIn publishing" : "Publish to"}
          </h3>
          <div className="mt-3 flex gap-5">
            {!linkedinWorkspace && <label><input type="checkbox" checked={publishWeb} onChange={() => toggleChannel("web")} /> Website</label>}
            <label><input type="checkbox" checked={publishLinkedin} onChange={() => toggleChannel("linkedin")} /> LinkedIn</label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => settingsMutation.mutate()}
          disabled={!settingsDirty || settingsMutation.isPending || isPublished}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {settingsMutation.isPending ? "Saving…" : "Save Publication Settings"}
        </button>

        {publishLinkedin && <>
          <div>
            <h3 className="font-semibold text-primary-white">LinkedIn mode</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["SAME", "SUMMARY", "CUSTOM"] as LinkedInMode[]).map((item) => (
                <label key={item}><input type="radio" name="linkedin-mode" checked={mode === item} onChange={() => changeMode(item)} /> {item}</label>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-300">{modeDescription}</p>
            <label className="mt-3 block"><input type="checkbox" checked={includeWebLink} disabled={!publishWeb} onChange={(event) => setIncludeWebLink(event.target.checked)} /> Include website article link</label>
            {!publishWeb && <p className="mt-1 text-sm text-yellow-200">Website link is unavailable because this post will not be published on the website.</p>}
          </div>

          {draftStale && ["SAME", "SUMMARY"].includes(publication.linkedinMode) && <p className="rounded border border-yellow-500 p-3 text-sm text-yellow-200">The website article changed after this LinkedIn draft was created. Consider regenerating it before publishing.</p>}

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-primary-white">LinkedIn Draft</h3>
              {mode !== "CUSTOM" && <button type="button" onClick={generateDraft} disabled={settingsDirty || draftMutation.isPending || isPublished} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{draftMutation.isPending ? "Generating…" : content ? "Regenerate" : "Generate"}</button>}
            </div>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={isPublished} className="mt-3 min-h-40 w-full rounded border border-gray-600 bg-primary-black p-3 text-primary-white" placeholder={mode === "CUSTOM" ? "Write the LinkedIn post…" : "Generate a draft to review…"} />
            <button type="button" onClick={() => saveDraftMutation.mutate()} disabled={!content.trim() || !contentDirty || settingsDirty || saveDraftMutation.isPending || isPublished} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saveDraftMutation.isPending ? "Saving…" : "Save LinkedIn Draft"}</button>
          </div>

          {publication.linkedinFactCheck?.requiresHumanFactCheck && <div className="rounded border border-yellow-500 p-3 text-yellow-100"><strong>Human fact-check recommended</strong><ul className="ml-5 list-disc">{publication.linkedinFactCheck.factCheckNotes.map((note) => <li key={note}>{note}</li>)}</ul></div>}

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h3 className="font-semibold text-primary-white">Media</h3><p className="text-sm text-gray-300">Mode: {publication.linkedinMediaMode}</p></div>
              {publication.linkedinMediaMode !== "none" && <div className="flex flex-wrap gap-2">
                <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Optional keywords" className="rounded border border-gray-600 bg-primary-black px-3 py-2 text-sm text-primary-white" />
                <button type="button" onClick={searchMedia} disabled={suggestionsMutation.isPending || isPublished} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{suggestionsMutation.isPending ? "Searching…" : keywordInput.trim() ? "Search Again" : "Find Suggestions"}</button>
              </div>}
            </div>

            {displayedCandidates.length > 0 && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">{displayedCandidates.map((candidate) => {
              const selected = selectedMedia.some((item) => item.providerId === candidate.providerId);
              return <article key={candidate.providerId} className={`overflow-hidden rounded border ${selected ? "border-blue-400" : "border-gray-600"}`}>
                <img src={candidate.imageUrl} alt={candidate.altText} className="h-32 w-full object-cover" />
                <div className="space-y-2 p-3 text-xs text-primary-white">
                  <label className="block">Alt text<input value={candidate.altText} onChange={(event) => updateAltText(candidate.providerId, event.target.value)} className="mt-1 w-full rounded border border-gray-600 bg-primary-black p-2" /></label>
                  <p>Photo by {candidate.photographer}</p>
                  <p>{candidate.attribution}</p>
                  <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="block text-blue-300 underline">View on Pexels</a>
                  <button type="button" onClick={() => toggleMedia(candidate)} className="rounded bg-blue-600 px-3 py-2 text-white">{selected ? "Remove" : "Select"}</button>
                </div>
              </article>;
            })}</div>}

            {publication.linkedinMediaMode !== "none" && <p className={`mt-2 text-sm ${mediaCountValid && altTextValid ? "text-green-300" : "text-yellow-200"}`}>{publication.linkedinMediaMode === "single-image" ? "Select exactly 1 image with alt text." : "Select 2–20 images with alt text."}</p>}
            {publication.linkedinMediaMode !== "none" && <button type="button" onClick={() => mediaMutation.mutate()} disabled={!mediaDirty || !mediaCountValid || !altTextValid || mediaMutation.isPending || isPublished} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{mediaMutation.isPending ? "Saving…" : "Save Selected Media"}</button>}
          </div>
        </>}

        <div className="border-t border-gray-600 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold text-primary-white">Publishing</h3><p className="text-sm text-gray-300">{linkedinWorkspace ? `LinkedIn: ${publishLinkedin ? publication.linkedinStatus : "Not selected"}` : `Website: ${publishWeb ? websitePublished ? "Published" : "Ready" : "Not selected"} · LinkedIn: ${publishLinkedin ? publication.linkedinStatus : "Not selected"}`}</p></div>
            {publishLinkedin && <button type="button" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending} className="rounded border border-blue-400 px-3 py-2 text-sm text-blue-200">{verifyMutation.isPending ? "Verifying…" : "Verify LinkedIn organization"}</button>}
          </div>

          {publishLinkedin && verification && <div className="mt-3 rounded border border-gray-600 p-3 text-sm text-gray-200">
            <p>Organization: {organizationName || "Configured organization"}</p>
            <p>Ready for organic posting: {verification.readyForOrganicPosting ? "Yes" : "No"}</p>
            <p>Roles: {verification.roles.map((role) => readProviderText(role, ["role", "roleType", "name"])).filter(Boolean).join(", ") || "None reported"}</p>
            {Object.entries(verification.permissions).map(([key, value]) => <p key={key}>{key}: {value ? "Yes" : "No"}</p>)}
          </div>}

          <p className="mt-2 text-sm text-gray-300">{statusCopy[publication.linkedinStatus]}</p>
          {publication.linkedinError && <p className="mt-2 text-sm text-red-300">{publication.linkedinError.message}</p>}
          {publication.linkedinStatus === "REVIEW_REQUIRED" && <p className="mt-3 rounded border border-red-500 p-3 text-red-200">LinkedIn publication outcome may be ambiguous. Check the Company Page before taking any further action. Automatic retry is disabled to avoid duplicate posts.</p>}
          {isPublished && <p className="mt-3 text-green-300">LinkedIn published {publication.linkedinPublishedAt ? `at ${new Date(publication.linkedinPublishedAt).toLocaleString()}` : ""}{publication.linkedinPostId ? ` · Post ID: ${publication.linkedinPostId}` : ""}</p>}
          {publication.linkedinStatus === "FAILED" && publication.linkedinError?.retryable === true && <button type="button" onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending} className="mt-3 rounded bg-amber-600 px-4 py-2 text-white">{retryMutation.isPending ? "Retrying…" : "Retry LinkedIn"}</button>}
          {hasUnsavedChanges && <p className="mt-3 text-sm text-yellow-200">Save publication settings, draft, and media before publishing.</p>}
          {publishLinkedin && !savedMediaValid && <p className="mt-2 text-sm text-yellow-200">Save a valid media selection before publishing.</p>}
          {canStartPublish && !(publishWeb && !publishLinkedin && websitePublished) && <button type="button" onClick={() => setShowConfirmation(true)} disabled={publishMutation.isPending || publishBlocked} className="mt-3 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{publishLabel}</button>}
        </div>
      </div>

      {showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-lg bg-primary-black p-6 text-primary-white shadow-xl">
        <h3 className="text-lg font-bold">Confirm publication</h3>
        <p className="mt-3">Targets: {publishWeb ? "Website" : ""}{publishWeb && publishLinkedin ? " + " : ""}{publishLinkedin ? "LinkedIn" : ""}</p>
        {publishLinkedin && <><p>LinkedIn mode: {publication.linkedinMode}</p><p>Website link: {publication.linkedinIncludeWebLink ? "Included" : "Not included"}</p><p>Media: {savedMedia.length} image{savedMedia.length === 1 ? "" : "s"}</p><p>LinkedIn status: {publication.linkedinStatus}</p></>}
        {publishWeb && publishLinkedin && <p className="mt-3 text-sm text-gray-300">Website will be published first. LinkedIn will publish afterward.</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowConfirmation(false)} className="rounded border border-gray-500 px-4 py-2">Cancel</button><button type="button" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="rounded bg-emerald-600 px-4 py-2">{publishMutation.isPending ? "Publishing…" : "Publish Now"}</button></div>
      </div></div>}
    </section>
  );
};

export default PublicationPanel;
