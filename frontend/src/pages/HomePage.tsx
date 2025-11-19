import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import ErrorMessage from "../components/ErrorMessage";
import ProgressBar from "../components/ProgressBar";
import { API_BASE_URL } from "../config/api";

const HomePage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<{
    title?: string;
    message: string;
    details?: string;
    suggestions?: string[];
  } | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login, loginWithGoogle, register, isAuthenticated, user, token } =
    useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/books", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    console.log("handleFileUpload called", event);
    const file = event.target.files?.[0];
    console.log("Selected file:", file);
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("=== BULLETPROOF UPLOAD START ===");
    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified),
    });

    // Validate file type
    const allowedExtensions = [".pdf", ".epub", ".txt", ".docx"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadError({
        title: "Unsupported file format",
        message: `We only support ${allowedExtensions.join(", ")} files.`,
        suggestions: [
          "Convert your file to PDF, EPUB, TXT, or DOCX format",
          "Check that the file extension is correct",
          "Try a different file",
        ],
      });
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setUploadError({
        title: "File too large",
        message: "The file is larger than 50MB. Please use a smaller file.",
        suggestions: [
          "Try compressing the PDF",
          "Split the book into smaller parts",
          "Use a text file instead of PDF for smaller size",
        ],
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStartTime(Date.now());

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      console.log("Creating FormData...");
      const formData = new FormData();
      formData.append("file", file);

      console.log("Making request to:", `${API_BASE_URL}/upload/book`);
      const startTime = Date.now();

      // For FormData, don't set Content-Type - browser will set it with boundary
      // Only include Authorization header if token exists
      const fetchOptions: RequestInit = {
        method: "POST",
        body: formData,
      };

      if (token) {
        fetchOptions.headers = {
          Authorization: `Bearer ${token}`,
        };
      }

      const response = await fetch(`${API_BASE_URL}/upload/book`, fetchOptions);

      const endTime = Date.now();

      console.log("=== RESPONSE ANALYSIS ===");
      console.log("Status:", response.status, response.statusText);
      console.log("OK:", response.ok);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
      console.log("Duration:", endTime - startTime, "ms");

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = "";
        let errorDetails = "";
        try {
          const errorData = await response.json().catch(() => null);
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else {
            const errorText = await response.text();
            errorDetails = errorText;
            errorMessage = `Upload failed (${response.status})`;
          }
        } catch (e) {
          errorMessage = `Upload failed (${response.status})`;
          errorDetails = response.statusText;
        }

        const suggestions: string[] = [];
        if (response.status === 401 || response.status === 403) {
          suggestions.push("Try logging out and back in");
          suggestions.push("Check that your session hasn't expired");
        } else if (response.status === 413) {
          suggestions.push("The file is too large");
          suggestions.push("Try a smaller file or compress the PDF");
        } else if (response.status === 415) {
          suggestions.push("The file format may not be supported");
          suggestions.push("Try converting to PDF or EPUB format");
        } else if (response.status >= 500) {
          suggestions.push("The server may be temporarily unavailable");
          suggestions.push("Try again in a few minutes");
        }

        throw {
          message: errorMessage,
          details: errorDetails,
          suggestions,
          status: response.status,
        };
      }

      // Parse JSON response
      let result: any;
      try {
        result = await response.json();
        console.log("✅ SUCCESS RESPONSE PARSED:", result);
      } catch (parseError: unknown) {
        console.error("JSON parsing failed:", parseError);
        const errorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Invalid response format: ${errorMessage}`);
      }

      // Validate response structure
      if (!result || typeof result !== "object") {
        console.error("Invalid response structure:", result);
        throw new Error("Server returned invalid response structure");
      }

      // Check for application-level errors
      if (result.book_id === undefined || result.book_id === null) {
        console.error("Missing book_id in response:", result);
        throw new Error("Server did not return valid book ID");
      }

      if (result.status === "error" || result.status === "failed") {
        console.error("Application error in response:", result);
        throw new Error(result.message || "Upload failed on server");
      }

      // Success!
      console.log("🎉 UPLOAD COMPLETELY SUCCESSFUL!");
      console.log("Book ID:", result.book_id);
      console.log("Title:", result.message);
      console.log("Status:", result.status);

      setUploadProgress(100);
      showToast(
        "Book uploaded successfully! Vocabulary processing in background.",
        "success",
      );

      // Small delay to show success feedback before navigation
      setTimeout(() => {
        navigate(`/book/${result.book_id}`);
      }, 500);
    } catch (error: any) {
      console.error("❌ UPLOAD ERROR:", error);

      if (error && typeof error === "object" && error.message) {
        setUploadError({
          title: "Upload failed",
          message: error.message,
          details: error.details,
          suggestions: error.suggestions || [],
        });
      } else {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        setUploadError({
          title: "Upload failed",
          message: errorMsg,
          suggestions: [],
        });
      }
    } finally {
      setIsUploading(false);
      setUploadStartTime(null);
      clearInterval(progressInterval);
      // Reset file input so it can be used again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      console.log("=== BULLETPROOF UPLOAD END ===");
    }
  };

  return (
    <div className="space-y-10">
      <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white/90 p-6 text-center shadow-soft-card">
        <p className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
          <span aria-hidden="true">📱</span> Built for phones
        </p>
        <h1 className="text-3xl phone:text-4xl md:text-5xl font-heading font-bold text-gray-900">
          Master Vocabulary Through Real Books
        </h1>

        <p className="mt-4 text-lg phone:text-xl text-gray-700 font-medium">
          The only vocabulary app that learns from YOUR reading
        </p>

        <p className="mt-3 text-base text-gray-600 px-4">
          Upload any book (PDF, EPUB, or text) in any language. Lexeme extracts
          every word, teaches you vocabulary in context, and never spoils the
          story.
        </p>

        {isAuthenticated && user && (
          <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-left text-green-800">
            <p className="text-sm font-medium">
              Welcome back, <strong>{user.username}</strong>!
              <button
                onClick={() => navigate("/books")}
                className="ml-2 inline-flex items-center text-green-700 underline"
              >
                Go to My Books →
              </button>
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-xl rounded-3xl border border-gray-100 bg-white/95 p-6 text-left shadow-soft-card">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Start in minutes
          </p>
          <h2 className="text-2xl font-heading font-semibold text-gray-900">
            Get Started
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Upload a book or sign in to continue your learning journey.
          </p>
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4">
            <ErrorMessage
              title={uploadError.title}
              message={uploadError.message}
              details={uploadError.details}
              suggestions={uploadError.suggestions}
              onRetry={() => {
                setUploadError(null);
                fileInputRef.current?.click();
              }}
              onDismiss={() => setUploadError(null)}
            />
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            {!showLogin && !showRegister && (
              <>
                <button
                  onClick={() => setShowLogin(true)}
                  className="btn-primary w-full py-3 text-lg"
                  aria-label="Sign in to your account"
                >
                  <span aria-hidden="true">🔐</span> Sign In
                </button>
                <button
                  onClick={() => setShowRegister(true)}
                  className="btn-secondary w-full py-3 text-lg"
                  aria-label="Create a new account"
                >
                  <span aria-hidden="true">✨</span> Create Account
                </button>
              </>
            )}

            {showLogin && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Sign In</h3>
                {authError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {authError}
                  </div>
                )}

                <button
                  onClick={loginWithGoogle}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative py-2">
                  <span
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-gray-200"
                    aria-hidden="true"
                  />
                  <span className="relative mx-auto max-w-max bg-white px-2 text-xs uppercase tracking-wide text-gray-400">
                    Or continue with
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Username"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex flex-col gap-2 phone:flex-row">
                  <button
                    onClick={() => {
                      setShowLogin(false);
                      setAuthError("");
                    }}
                    className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setAuthError("");
                        setIsLoggingIn(true);

                        await login(loginData.username, loginData.password);
                        setShowLogin(false);
                        setIsLoggingIn(false);
                        showToast("Welcome back!", "success");
                        const onboardingCompleted = localStorage.getItem(
                          "onboarding_completed",
                        );
                        if (onboardingCompleted) {
                          navigate("/books");
                        } else {
                          navigate("/onboarding");
                        }
                      } catch (err) {
                        console.error("Login error in handler:", err);
                        const errorMsg =
                          err instanceof Error ? err.message : "Login failed";
                        setAuthError(errorMsg);
                        setIsLoggingIn(false);
                      }
                    }}
                    disabled={isLoggingIn}
                    className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isLoggingIn ? "Signing in..." : "Sign In"}
                  </button>
                </div>
              </div>
            )}

            {showRegister && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Create Account</h3>
                {authError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {authError}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Username"
                  value={registerData.username}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      username: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      password: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex flex-col gap-2 phone:flex-row">
                  <button
                    onClick={() => {
                      setShowRegister(false);
                      setAuthError("");
                    }}
                    className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await register(
                          registerData.username,
                          registerData.email,
                          registerData.password,
                        );
                        setShowRegister(false);
                        showToast("Account created successfully!", "success");
                        navigate("/onboarding");
                      } catch (err) {
                        const errorMsg =
                          err instanceof Error
                            ? err.message
                            : "Registration failed";
                        setAuthError(errorMsg);
                      }
                    }}
                    className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : !isUploading ? (
          <div className="space-y-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Upload button clicked");

                if (isUploading) {
                  console.warn("Upload already in progress");
                  return;
                }

                // Try multiple methods to trigger file input
                const fileInput =
                  fileInputRef.current ||
                  (document.getElementById(
                    "file-upload-input",
                  ) as HTMLInputElement);

                if (fileInput) {
                  try {
                    // Ensure input is accessible
                    fileInput.style.display = "none";
                    fileInput.click();
                    console.log("File input click triggered successfully");
                  } catch (error) {
                    console.error("Error triggering file input:", error);
                    setUploadError({
                      title: "Upload Error",
                      message: "Failed to open file picker. Please try again.",
                      suggestions: [
                        "Refresh the page and try again",
                        "Check browser console for details",
                      ],
                    });
                  }
                } else {
                  console.error("File input not found!");
                  setUploadError({
                    title: "Upload Error",
                    message:
                      "File input not available. Please refresh the page.",
                    suggestions: [
                      "Refresh the page",
                      "Check that JavaScript is enabled",
                    ],
                  });
                }
              }}
              disabled={isUploading}
              className="btn-primary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Upload a book file"
              type="button"
            >
              <span aria-hidden="true">📖</span>{" "}
              {isUploading ? "Uploading..." : "Upload Your Book"}
            </button>

            <button
              onClick={() => navigate("/books")}
              className="btn-secondary w-full py-3 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              aria-label="View your library"
            >
              <span aria-hidden="true">📚</span> My Books
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <ProgressBar
              progress={uploadProgress}
              message={
                uploadProgress < 30
                  ? "Uploading file..."
                  : uploadProgress >= 30 && uploadProgress < 60
                    ? "Extracting text..."
                    : uploadProgress >= 60 && uploadProgress < 90
                      ? "Analyzing vocabulary..."
                      : "Processing complete!"
              }
              showTimeEstimate={uploadProgress > 0 && uploadProgress < 100}
              startTime={uploadStartTime || undefined}
            />
          </div>
        )}

        {/* File input - always rendered so ref works properly */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,.txt,.docx"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          aria-label="Upload book file"
          id="file-upload-input"
        />
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-soft-card">
        <h2 className="text-center text-xl font-heading font-semibold text-gray-900">
          Why learners love Lexeme
        </h2>
        <div className="mt-5 grid grid-cols-1 phone:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: "✅",
              title: "Real Literature",
              description: "Not textbooks—actual stories you want to read.",
            },
            {
              icon: "🚫",
              title: "Zero Spoilers",
              description: "Vocabulary only. We never reveal plot details.",
            },
            {
              icon: "🌍",
              title: "Any Language",
              description: "50+ languages powered by native-level NLP.",
            },
            {
              icon: "🎯",
              title: "Spaced Repetition",
              description: "Smart review system for long-term memory.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="text-3xl" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="mt-2 text-base font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-soft-card">
        <h2 className="text-center text-2xl font-heading font-semibold text-gray-900">
          How it works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              step: "1️⃣",
              title: "Upload Your Book",
              description: "PDF, EPUB, or text file in any language.",
            },
            {
              step: "2️⃣",
              title: "Read & Tap",
              description:
                "Tap unknown words for instant context + definitions.",
            },
            {
              step: "3️⃣",
              title: "Review Anywhere",
              description: "Spaced repetition cards built from your reading.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center"
            >
              <div className="text-4xl" aria-hidden="true">
                {item.step}
              </div>
              <h3 className="mt-3 text-base font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
