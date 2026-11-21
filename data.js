/* ============================================================
   data.js — loads courses / chapters / videos from Supabase.
   Returns data in the same shape the pages already use, so the
   page rendering code stays the same.
   Needs supabase-config.js (the `sb` client) loaded before it.
============================================================ */

/* ids of courses this student owns (approved) or has a pending request for */
async function getMyEnrollmentIds() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { owned: [], pending: [] };
  const [enr, prof] = await Promise.all([
    sb.from('enrollments').select('course_id,status')
      .eq('user_id', session.user.id).in('status', ['approved', 'pending']),
    sb.from('profiles').select('banned').eq('id', session.user.id).maybeSingle()
  ]);
  // suspended account: sign out and go to the login page
  if (prof.data && prof.data.banned) {
    await sb.auth.signOut();
    location.href = 'login.html?banned=1';
    return { owned: [], pending: [] };
  }
  const rows = enr.data || [];
  return {
    owned: rows.filter(r => r.status === 'approved').map(r => r.course_id),
    pending: rows.filter(r => r.status === 'pending').map(r => r.course_id)
  };
}

/* all published courses, for courses.html */
async function fetchCourses() {
  const { data, error } = await sb.from('courses')
    .select('id,title,tag,description,price,meta,sort_order,chapters(id,videos(id))')
    .eq('published', true)
    .order('sort_order').order('id');
  if (error) { console.error('fetchCourses:', error); return []; }
  const mine = await getMyEnrollmentIds();
  return data.map(c => ({
    id: c.id,
    title: c.title,
    tag: c.tag,
    tagClass: (c.meta && c.meta.tagClass) || 'tag-ssc',
    desc: c.description,
    price: c.price || null,               // 0 = "Price TBD"
    chapters: c.chapters.length,
    videos: c.chapters.reduce((s, ch) => s + ch.videos.length, 0),
    accentFrom: (c.meta && c.meta.accentFrom) || '#0a2a3a',
    accentTo: (c.meta && c.meta.accentTo) || '#050814',
    owned: mine.owned.includes(c.id),
    pending: mine.pending.includes(c.id)
  }));
}

/* one course with chapters + videos, for course.html */
async function fetchCourse(id) {
  if (!id) return null;
  const { data: c, error } = await sb.from('courses')
    .select('id,title,tag,description,price,meta,chapters(id,name,sort_order,videos(id,title,duration,is_free,sort_order))')
    .eq('id', id).maybeSingle();
  if (error) { console.error('fetchCourse:', error); return null; }
  if (!c) return null;
  const mine = await getMyEnrollmentIds();
  const bySort = (a, b) => ((a.sort_order || 0) - (b.sort_order || 0)) || (a.id - b.id);
  const m = c.meta || {};
  return {
    id: c.id,
    title: c.title,
    tag: c.tag,
    tagColor: m.tagColor || '#22d3ee',
    tagBg: m.tagBg || 'rgba(34,211,238,0.08)',
    accentFrom: m.accentFrom || '#0a2a3a',
    desc: m.longDesc || c.description,
    price: c.price || null,
    owned: mine.owned.includes(c.id),
    pending: mine.pending.includes(c.id),
    chapters: c.chapters.sort(bySort).map(ch => ({
      name: ch.name,
      videos: ch.videos.sort(bySort).map(v => ({
        id: v.id, title: v.title, duration: v.duration, free: v.is_free
      }))
    }))
  };
}

/* YouTube id of one video. The database only returns it if the video is
   free or the student has an approved enrollment — otherwise returns ''. */
async function fetchYoutubeId(videoId) {
  const { data } = await sb.from('video_sources')
    .select('youtube_id').eq('video_id', videoId).maybeSingle();
  return data ? data.youtube_id : '';
}

/* sign the student out and go back to the login page */
async function signOut() {
  await sb.auth.signOut();
  location.href = 'login.html';
}
