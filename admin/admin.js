"use strict";

const state = {
  posts: [],
  credentials: null,
  submitting: false,
  deleting: false,
};

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   AUTHENTICATION
   ========================================================= */

function authHeader() {
  if (!state.credentials) {
    return {};
  }

  return {
    Authorization:
      `Basic ${state.credentials}`,
  };
}

function encodeCredentials(
  username,
  password,
) {
  const value =
    `${username}:${password}`;

  return btoa(
    Array.from(
      new TextEncoder().encode(
        value,
      ),
      (byte) =>
        String.fromCharCode(
          byte,
        ),
    ).join(""),
  );
}

function setStatus(
  id,
  message = "",
  error = false,
) {
  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.color =
    error
      ? "#dc2626"
      : "";
}

function logout() {
  state.credentials = null;
  state.posts = [];
  state.submitting = false;
  state.deleting = false;

  sessionStorage.removeItem(
    "blog_admin_credentials",
  );

  $("app-view")
    ?.classList.add("hidden");

  $("login-view")
    ?.classList.remove("hidden");

  if ($("login-pass")) {
    $("login-pass").value = "";
  }

  setStatus(
    "login-status",
    "",
  );

  setStatus(
    "form-status",
    "",
  );
}


/* =========================================================
   API
   ========================================================= */

async function api(
  url,
  options = {},
) {
  const headers = {
    Accept:
      "application/json",

    ...authHeader(),

    ...(options.body
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),

    ...(options.headers || {}),
  };

  let response;

  try {
    response =
      await fetch(
        url,
        {
          ...options,
          headers,
          credentials:
            "same-origin",
        },
      );
  } catch {
    throw new Error(
      "Unable to connect to the server. Please check your internet connection.",
    );
  }

  if (
    response.status ===
    401
  ) {
    logout();

    throw new Error(
      "Invalid or expired admin credentials.",
    );
  }

  let data = null;

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    try {
      data =
        await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}.`,
    );
  }

  if (
    response.status ===
    204
  ) {
    return null;
  }

  return data;
}


/* =========================================================
   DATE
   ========================================================= */

function getLocalDate() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* =========================================================
   SLUG
   ========================================================= */

function generateSlug(
  value,
) {
  return String(
    value || "",
  )
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /&/g,
      " and ",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .replace(
      /-{2,}/g,
      "-",
    );
}

function setupSlugGeneration() {
  const title =
    $("title");

  const slug =
    $("slug");

  if (!title || !slug) {
    return;
  }

  let manuallyEdited =
    slug.value.trim()
      .length > 0;

  slug.addEventListener(
    "input",
    () => {
      manuallyEdited =
        slug.value.trim()
          .length > 0;
    },
  );

  title.addEventListener(
    "input",
    () => {
      if (
        !manuallyEdited ||
        !slug.value.trim()
      ) {
        slug.value =
          generateSlug(
            title.value,
          );
      }
    },
  );
}


/* =========================================================
   FORM
   ========================================================= */

function fill(post) {
  if (!post) {
    return;
  }

  $("post-id").value =
    post.id ?? "";

  $("title").value =
    post.title ?? "";

  $("slug").value =
    post.slug ?? "";

  $("date").value =
    post.date
      ? String(
          post.date,
        ).slice(0, 10)
      : getLocalDate();

  $("read-time").value =
    post.readTime ??
    post.read_time ??
    5;

  $("excerpt").value =
    post.excerpt ?? "";

  $("image").value =
    post.image ?? "";

  $("tags").value =
    Array.isArray(post.tags)
      ? post.tags.join(", ")
      : "";

  $("author").value =
    post.author ||
    "Kartik Yadav Gurve";

  $("featured").checked =
    Boolean(
      post.featured,
    );

  $("published").checked =
    Boolean(
      post.published,
    );

  $("content").value =
    post.content ?? "";

  $("form-heading")
    .textContent =
    "Edit Post";

  $("save-btn")
    .textContent =
    "Update Post";

  setStatus(
    "form-status",
    "",
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function resetForm() {
  const form =
    $("post-form");

  if (!form) {
    return;
  }

  form.reset();

  $("post-id").value =
    "";

  $("author").value =
    "Kartik Yadav Gurve";

  $("read-time").value =
    5;

  $("date").value =
    getLocalDate();

  $("form-heading")
    .textContent =
    "Create Post";

  $("save-btn")
    .textContent =
    "Create Post";

  setStatus(
    "form-status",
    "",
  );
}


/* =========================================================
   PAYLOAD
   ========================================================= */

function getPostPayload() {
  const title =
    $("title")
      .value
      .trim();

  const slug =
    generateSlug(
      $("slug")
        .value
        .trim() ||
        title,
    );

  const readTime =
    Number.parseInt(
      $("read-time")
        .value,
      10,
    );

  const tags =
    $("tags")
      .value
      .split(",")
      .map(
        (tag) =>
          tag.trim(),
      )
      .filter(Boolean);

  return {
    title,

    slug,

    excerpt:
      $("excerpt")
        .value
        .trim(),

    image:
      $("image")
        .value
        .trim(),

    tags,

    author:
      $("author")
        .value
        .trim() ||
      "Kartik Yadav Gurve",

    date:
      $("date")
        .value ||
      getLocalDate(),

    readTime:
      Number.isFinite(
        readTime,
      ) &&
      readTime > 0
        ? readTime
        : 5,

    featured:
      $("featured")
        .checked,

    published:
      $("published")
        .checked,

    content:
      $("content")
        .value
        .trim(),
  };
}


/* =========================================================
   VALIDATION
   ========================================================= */

function validatePost(
  payload,
) {
  if (!payload.title) {
    return "Title is required.";
  }

  if (!payload.slug) {
    return "A valid slug could not be generated.";
  }

  if (!payload.content) {
    return "Content HTML is required.";
  }

  if (!payload.date) {
    return "Please select a publication date.";
  }

  if (
    !Number.isInteger(
      payload.readTime,
    ) ||
    payload.readTime < 1
  ) {
    return "Read time must be at least 1 minute.";
  }

  return null;
}


/* =========================================================
   TABLE
   ========================================================= */

function escapeHtml(
  value,
) {
  const element =
    document.createElement(
      "div",
    );

  element.textContent =
    value ?? "";

  return element.innerHTML;
}

function renderPosts() {
  const body =
    $("posts-body");

  if (!body) {
    return;
  }

  if (!state.posts.length) {
    body.innerHTML = `
      <tr>
        <td colspan="3">
          No posts yet.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    state.posts
      .map(
        (post) => {
          const id =
            escapeHtml(
              String(
                post.id ?? "",
              ),
            );

          const title =
            escapeHtml(
              post.title ??
                "Untitled",
            );

          const date =
            escapeHtml(
              String(
                post.date ?? "",
              ).slice(0, 10),
            );

          const published =
            Boolean(
              post.published,
            );

          return `
            <tr>

              <td>
                <strong>
                  ${title}
                </strong>

                <br />

                <small>
                  ${date}
                </small>
              </td>

              <td>
                <span
                  class="admin-badge ${
                    published
                      ? ""
                      : "draft"
                  }"
                >
                  ${
                    published
                      ? "Published"
                      : "Draft"
                  }
                </span>
              </td>

              <td>

                <div
                  class="admin-actions"
                >

                  <button
                    class="admin-btn admin-btn-secondary"
                    type="button"
                    data-edit="${id}"
                  >
                    Edit
                  </button>

                  <button
                    class="admin-btn admin-btn-danger"
                    type="button"
                    data-delete="${id}"
                  >
                    Delete
                  </button>

                </div>

              </td>

            </tr>
          `;
        },
      )
      .join("");
}


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts() {
  const body =
    $("posts-body");

  if (body) {
    body.innerHTML = `
      <tr>
        <td colspan="3">
          Loading posts...
        </td>
      </tr>
    `;
  }

  try {
    const posts =
      await api(
        "/api/admin/posts",
      );

    state.posts =
      Array.isArray(posts)
        ? posts
        : [];

    renderPosts();
  } catch (error) {
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="3">
            ${escapeHtml(
              error.message,
            )}
          </td>
        </tr>
      `;
    }

    throw error;
  }
}


/* =========================================================
   DELETE
   ========================================================= */

async function deletePost(
  id,
) {
  if (state.deleting) {
    return;
  }

  const post =
    state.posts.find(
      (item) =>
        String(item.id) ===
        String(id),
    );

  if (!post) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${post.title}"?\n\nThis action cannot be undone.`,
    );

  if (!confirmed) {
    return;
  }

  state.deleting = true;

  try {
    await api(
      `/api/admin/posts/${encodeURIComponent(
        id,
      )}`,
      {
        method: "DELETE",
      },
    );

    resetForm();

    await loadPosts();

    setStatus(
      "form-status",
      "Post deleted successfully.",
    );
  } catch (error) {
    setStatus(
      "form-status",
      error.message,
      true,
    );
  } finally {
    state.deleting = false;
  }
}


/* =========================================================
   TABLE ACTIONS
   ========================================================= */

function setupTableActions() {
  const body =
    $("posts-body");

  if (!body) {
    return;
  }

  body.addEventListener(
    "click",
    (event) => {
      const editButton =
        event.target.closest(
          "[data-edit]",
        );

      if (editButton) {
        const post =
          state.posts.find(
            (item) =>
              String(
                item.id,
              ) ===
              String(
                editButton
                  .dataset
                  .edit,
              ),
          );

        if (post) {
          fill(post);
        }

        return;
      }

      const deleteButton =
        event.target.closest(
          "[data-delete]",
        );

      if (deleteButton) {
        deletePost(
          deleteButton
            .dataset
            .delete,
        );
      }
    },
  );
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login(
  username,
  password,
) {
  state.credentials =
    encodeCredentials(
      username,
      password,
    );

  try {
    await api(
      "/api/admin/me",
    );

    sessionStorage.setItem(
      "blog_admin_credentials",
      state.credentials,
    );

    $("login-view")
      .classList.add(
        "hidden",
      );

    $("app-view")
      .classList.remove(
        "hidden",
      );

    $("date").value =
      getLocalDate();

    setStatus(
      "login-status",
      "",
    );

    await loadPosts();
  } catch (error) {
    state.credentials =
      null;

    setStatus(
      "login-status",
      error.message,
      true,
    );

    throw error;
  }
}


/* =========================================================
   LOGIN FORM
   ========================================================= */

function setupLoginForm() {
  const form =
    $("login-form");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const username =
        $("login-user")
          .value
          .trim();

      const password =
        $("login-pass")
          .value;

      if (
        !username ||
        !password
      ) {
        setStatus(
          "login-status",
          "Username and password are required.",
          true,
        );

        return;
      }

      const button =
        form.querySelector(
          'button[type="submit"]',
        );

      const originalText =
        button?.textContent ||
        "Login";

      if (button) {
        button.disabled =
          true;

        button.textContent =
          "Signing in...";
      }

      setStatus(
        "login-status",
        "",
      );

      try {
        await login(
          username,
          password,
        );

        $("login-pass")
          .value = "";
      } catch {
        // Error already shown.
      } finally {
        if (button) {
          button.disabled =
            false;

          button.textContent =
            originalText;
        }
      }
    },
  );
}


/* =========================================================
   POST FORM
   ========================================================= */

function setupPostForm() {
  const form =
    $("post-form");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (state.submitting) {
        return;
      }

      const id =
        $("post-id")
          .value
          .trim();

      const payload =
        getPostPayload();

      const validationError =
        validatePost(
          payload,
        );

      if (validationError) {
        setStatus(
          "form-status",
          validationError,
          true,
        );

        return;
      }

      state.submitting =
        true;

      const button =
        $("save-btn");

      const originalText =
        button?.textContent ||
        (
          id
            ? "Update Post"
            : "Create Post"
        );

      if (button) {
        button.disabled =
          true;

        button.textContent =
          id
            ? "Updating..."
            : "Creating...";
      }

      setStatus(
        "form-status",
        "",
      );

      try {
        if (id) {
          await api(
            `/api/admin/posts/${encodeURIComponent(
              id,
            )}`,
            {
              method: "PUT",

              body:
                JSON.stringify({
                  ...payload,
                  id,
                }),
            },
          );
        } else {
          await api(
            "/api/admin/posts",
            {
              method: "POST",

              body:
                JSON.stringify(
                  payload,
                ),
            },
          );
        }

        const successMessage =
          id
            ? "Post updated successfully."
            : "Post created successfully.";

        resetForm();

        await loadPosts();

        setStatus(
          "form-status",
          successMessage,
        );
      } catch (error) {
        setStatus(
          "form-status",
          error.message,
          true,
        );
      } finally {
        state.submitting =
          false;

        if (button) {
          button.disabled =
            false;

          button.textContent =
            originalText;
        }
      }
    },
  );
}


/* =========================================================
   CONTROLS
   ========================================================= */

function setupControls() {
  $("logout-btn")
    ?.addEventListener(
      "click",
      logout,
    );

  $("reset-btn")
    ?.addEventListener(
      "click",
      resetForm,
    );
}


/* =========================================================
   RESTORE SESSION
   ========================================================= */

async function restoreSession() {
  const saved =
    sessionStorage.getItem(
      "blog_admin_credentials",
    );

  if (!saved) {
    return;
  }

  state.credentials =
    saved;

  try {
    await api(
      "/api/admin/me",
    );

    $("login-view")
      .classList.add(
        "hidden",
      );

    $("app-view")
      .classList.remove(
        "hidden",
      );

    $("date").value =
      getLocalDate();

    await loadPosts();
  } catch {
    logout();
  }
}


/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupSlugGeneration();
    setupTableActions();
    setupLoginForm();
    setupPostForm();
    setupControls();

    await restoreSession();
  },
);