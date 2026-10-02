-- Anonymous visitors may submit pending messages and read approved messages.
-- The email column is never selectable by the anon role.

create table if not exists public.guestbook_messages (
	id uuid primary key default gen_random_uuid(),
	display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
	email text not null check (
		char_length(btrim(email)) between 3 and 254
		and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
	),
	message text not null check (char_length(btrim(message)) between 1 and 2000),
	approved boolean not null default false,
	created_at timestamptz not null default now()
);

alter table public.guestbook_messages enable row level security;

revoke all on table public.guestbook_messages from public, anon, authenticated;
grant usage on schema public to anon;
grant insert (display_name, email, message)
	on table public.guestbook_messages to anon;
grant select (id, display_name, message, created_at)
	on table public.guestbook_messages to anon;

drop policy if exists "Visitors can submit pending guestbook messages"
	on public.guestbook_messages;
create policy "Visitors can submit pending guestbook messages"
	on public.guestbook_messages
	for insert to anon
	with check (approved = false);

drop policy if exists "Visitors can read approved guestbook messages"
	on public.guestbook_messages;
create policy "Visitors can read approved guestbook messages"
	on public.guestbook_messages
	for select to anon
	using (approved = true);

create index if not exists guestbook_messages_approved_created_at_idx
	on public.guestbook_messages (created_at desc)
	where approved = true;
