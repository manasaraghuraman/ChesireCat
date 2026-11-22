create table public.players (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null check(char_length(trim(display_name)) between 1 and 24),
 created_at timestamptz not null default now()
);
create table public.runs (
 id uuid primary key, player_id uuid not null references public.players on delete cascade,
 level_id text not null, time_ticks int not null check(time_ticks>0),
 final_time_ms int not null check(final_time_ms>=0), leaks_cleared int not null,
 optional_cleared int not null, medal text not null, ghost_path text not null,
 created_at timestamptz not null default now()
);
create index runs_by_level on public.runs(level_id,final_time_ms);
create index runs_by_player on public.runs(player_id,created_at desc);
alter table public.players enable row level security;
alter table public.runs enable row level security;
revoke all on public.players, public.runs from anon,authenticated;
grant select on public.players, public.runs to anon,authenticated;
create policy public_names on public.players for select using(true);
create policy public_times on public.runs for select using(true);
create view public.leaderboard with(security_invoker=true) as
select b.*,p.display_name,rank() over(partition by level_id order by final_time_ms) as place
from (select distinct on(level_id,player_id) level_id,player_id,final_time_ms,medal,ghost_path
from public.runs order by level_id,player_id,final_time_ms,created_at,id) b join public.players p on p.id=b.player_id;
grant select on public.leaderboard to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ghosts','ghosts',false,2097152,array['application/json']);
create policy read_ghosts on storage.objects for select using(bucket_id='ghosts');

create function public.record_run(p_id uuid,p_player uuid,p_name text,p_level text,p_ticks int,p_ms int,p_leaks int,p_optional int,p_medal text,p_path text)
returns void language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_player::text,0));
 if exists(select 1 from public.runs where player_id=p_player and created_at>clock_timestamp()-interval '5 seconds') then
 raise exception 'Submission cooldown'; end if;
 insert into public.players(id,display_name) values(p_player,p_name)
 on conflict(id) do update set display_name=excluded.display_name;
 insert into public.runs(id,player_id,level_id,time_ticks,final_time_ms,leaks_cleared,optional_cleared,medal,ghost_path)
 values(p_id,p_player,p_level,p_ticks,p_ms,p_leaks,p_optional,p_medal,p_path);
end $$;
revoke all on function public.record_run from public,anon,authenticated;
grant execute on function public.record_run to service_role;

create table public.commentary_requests(player_id uuid primary key references auth.users on delete cascade,last_at timestamptz not null);
alter table public.commentary_requests enable row level security;
revoke all on public.commentary_requests from anon, authenticated;
create function public.claim_commentary(p_player uuid) returns boolean language plpgsql set search_path='' as $$
begin
 insert into public.commentary_requests values(p_player,clock_timestamp())
 on conflict(player_id) do update set last_at=clock_timestamp()
 where public.commentary_requests.last_at<clock_timestamp()-interval '15 seconds';
 return found;
end $$;
revoke all on function public.claim_commentary from public,anon,authenticated;
grant execute on function public.claim_commentary to service_role;
