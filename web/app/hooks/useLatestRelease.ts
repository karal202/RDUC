"use client";

import { useEffect, useState } from "react";

const GITHUB_API =
  "https://api.github.com/repos/karal202/RDUC/releases/latest";

/** Fallback khi GitHub API chưa load xong hoặc lỗi */
const FALLBACK_URL =
  "https://github.com/karal202/RDUC/releases/latest/download/Dawa-Optimizer-Setup.exe";

interface LatestRelease {
  downloadUrl: string;
  version: string;
  releaseName: string;
  releaseNotes: string;
  loading: boolean;
}

/**
 * Tự động lấy link file .exe mới nhất, tên release, version và release notes
 * từ GitHub Releases. Nếu fetch lỗi thì dùng URL fallback (GitHub tự redirect).
 */
export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    downloadUrl: FALLBACK_URL,
    version: "",
    releaseName: "",
    releaseNotes: "",
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(GITHUB_API, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`GitHub API ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;

        const assets: { name: string; browser_download_url: string }[] =
          data.assets ?? [];

        const exeAsset = assets.find(
          (a) => /\.exe$/i.test(a.name) && !a.name.endsWith(".blockmap"),
        );

        const rawTag = String(data.tag_name ?? "");
        const normalizedVersion = rawTag.replace(/^v/i, "");

        setState({
          downloadUrl: exeAsset?.browser_download_url ?? FALLBACK_URL,
          version: normalizedVersion,
          releaseName: String(data.name ?? ""),
          releaseNotes: String(data.body ?? "").trim(),
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            downloadUrl: FALLBACK_URL,
            version: "",
            releaseName: "",
            releaseNotes: "",
            loading: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
