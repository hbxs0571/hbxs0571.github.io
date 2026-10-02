(function () {
	"use strict";

	const form = document.getElementById("guestbook-form");
	const list = document.getElementById("guestbook-list");
	const status = document.querySelector(".guestbook-status");
	const submitButton = form.querySelector('button[type="submit"]');
	const config = window.GUESTBOOK_CONFIG || {};
	const projectUrl = typeof config.url === "string" ? config.url.trim() : "";
	const publishableKey = typeof config.publishableKey === "string" ? config.publishableKey.trim() : "";
	const configured = projectUrl.startsWith("https://")
		&& projectUrl.endsWith(".supabase.co")
		&& publishableKey.startsWith("sb_publishable_");
	const tableUrl = configured ? projectUrl + "/rest/v1/guestbook_messages" : "";

	function setStatus(message, isError) {
		status.textContent = message;
		status.classList.toggle("is-error", Boolean(isError));
	}

	function requestHeaders(extra) {
		return Object.assign({
			"apikey": publishableKey,
			"Authorization": "Bearer " + publishableKey
		}, extra || {});
	}

	function renderMessages(messages) {
		list.replaceChildren();
		if (!messages.length) {
			const empty = document.createElement("p");
			empty.className = "empty-state";
			empty.textContent = "这里还没有公开留言，期待听到你的故事。";
			list.appendChild(empty);
			return;
		}

		messages.forEach(function (message) {
			const article = document.createElement("article");
			article.className = "guestbook-entry";
			const heading = document.createElement("div");
			heading.className = "guestbook-entry-heading";
			const name = document.createElement("h3");
			name.textContent = message.display_name;
			const time = document.createElement("time");
			time.dateTime = message.created_at;
			time.textContent = new Intl.DateTimeFormat("zh-CN", {
				year: "numeric", month: "short", day: "numeric"
			}).format(new Date(message.created_at));
			heading.append(name, time);
			const body = document.createElement("p");
			body.className = "guestbook-entry-message";
			body.textContent = message.message;
			article.append(heading, body);
			list.appendChild(article);
		});
	}

	async function loadMessages() {
		const query = new URLSearchParams({
			select: "id,display_name,message,created_at",
			order: "created_at.desc",
			limit: "50"
		});
		const response = await fetch(tableUrl + "?" + query.toString(), {
			method: "GET",
			headers: requestHeaders({ "Accept": "application/json" })
		});
		if (!response.ok) throw new Error("Could not load guestbook entries");
		renderMessages(await response.json());
	}

	if (!configured) {
		setStatus("留言服务尚未完成项目配置。", true);
		return;
	}

	submitButton.disabled = false;
	submitButton.textContent = "提交留言";
	setStatus("留言已开启审核，邮箱不会公开展示。", false);
	loadMessages().catch(function () {
		setStatus("留言加载失败，请稍后刷新页面。", true);
		const empty = document.createElement("p");
		empty.className = "empty-state";
		empty.textContent = "暂时无法加载留言。";
		list.replaceChildren(empty);
	});

	form.addEventListener("submit", async function (event) {
		event.preventDefault();
		if (!form.reportValidity()) return;
		const fields = new FormData(form);
		if (String(fields.get("website") || "").trim()) {
			form.reset();
			setStatus("留言暂时无法提交，请稍后再试。", true);
			return;
		}
		const payload = {
			display_name: String(fields.get("name") || "").trim(),
			email: String(fields.get("email") || "").trim(),
			message: String(fields.get("message") || "").trim()
		};
		if (!payload.display_name || !payload.email || !payload.message) return;
		submitButton.disabled = true;
		submitButton.textContent = "提交中……";
		setStatus("正在提交留言……", false);
		try {
			const response = await fetch(tableUrl, {
				method: "POST",
				headers: requestHeaders({
					"Content-Type": "application/json",
					"Prefer": "return=minimal"
				}),
				body: JSON.stringify(payload)
			});
			if (!response.ok) throw new Error("Could not submit guestbook entry");
			form.reset();
			setStatus("留言已收到，审核通过后会显示在下方。谢谢你愿意分享。", false);
		} catch (error) {
			setStatus("提交失败，请检查网络后重试。你的内容尚未保存。", true);
		} finally {
			submitButton.disabled = false;
			submitButton.textContent = "提交留言";
		}
	});
}());
