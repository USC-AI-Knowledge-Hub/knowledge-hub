import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { WavyProgress } from "../components/WavyProgress";
import { BUCKETS, SELF_RATING, bucketById, coursesIn, placeFor, type Answer, type Answers, type Bucket } from "../data/buckets";
import { useBucketProgress } from "../lib/bucketProgress";
import "../styles/start.css";

const STEPS = [
  "Find your bucket. Answer four short questions. If you're between two buckets, start with the lower one; you can always skim ahead.",
  "Do the core courses in your bucket, at your own pace. Each bucket takes roughly 7 to 10 hours, so spread it across the weeks you signed up for.",
  "Add an optional extra if you have time. These are longer courses for going deeper, and none are required.",
  "Use the lower buckets as a refresher. In Bucket 2 or 3, skim the bucket below yours and spend your time where you feel least sure.",
  "Move up when you're ready. If you finish early, start the next bucket.",
  "Share what you learn on the AI Team boards, where each course has its own discussion.",
];

function CourseList({ bucket }: { bucket: Bucket["id"] }) {
  const { isDone, toggle } = useBucketProgress();
  const list = coursesIn(bucket);
  const finished = list.filter((c) => isDone(c.id)).length;
  return (
    <>
      <div className="start-progress" role="group" aria-label={`Bucket ${bucket} progress`}>
        <WavyProgress value={finished / list.length} label={`${finished} of ${list.length} courses done`} />
        <p className="label-l">
          {finished} of {list.length} courses done
        </p>
      </div>
      <ul className="start-courses">
        {list.map((c) => (
          <li key={c.id} className="start-course">
            <label className="start-check">
              <input type="checkbox" checked={isDone(c.id)} onChange={() => toggle(c.id)} />
              <span className="visually-hidden">Mark {c.title} as done</span>
            </label>
            <div className="start-course-body">
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="title-m">
                {c.title}
                <Icon name="open_in_new" size={16} />
              </a>
              <span className="body-s muted">{c.provider}</span>
            </div>
            <Link to={`/team?board=${c.id}`} className="btn text sm state">
              <Icon name="forum" size={18} />
              Discuss
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Finder() {
  const [answers, setAnswers] = useState<Answers>({});
  const { bucket: saved, setBucket } = useBucketProgress();
  const result = placeFor(answers);
  const answered = SELF_RATING.filter((q) => answers[q.id]).length;
  const options: { value: Answer; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "unsure", label: "Not sure" },
    { value: "no", label: "No" },
  ];
  return (
    <section className="section" aria-labelledby="find-h">
      <h2 id="find-h" className="headline-m">
        Find your bucket
      </h2>
      <p className="body-m muted measure">Four questions, about a minute. Nothing is sent anywhere; your answers stay in this page.</p>
      <ol className="start-questions">
        {SELF_RATING.map((q) => (
          <li key={q.id} className="start-question">
            <p className="title-s" id={`q-${q.id}`}>
              {q.question}
            </p>
            <Segmented<Answer>
              label={q.question}
              value={(answers[q.id] ?? "") as Answer}
              onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
              options={options}
            />
            <p className="body-s muted">A yes shows: {q.shows.toLowerCase()}</p>
          </li>
        ))}
      </ol>
      {!result && <p className="body-m muted" aria-live="polite">{answered} of {SELF_RATING.length} answered.</p>}
      {result && (
        <div className="start-result card filled" aria-live="polite">
          <p className="label-l">Your starting point</p>
          <h3 className="headline-s">
            Bucket {result.bucket}: {bucketById.get(result.bucket)!.name}
          </h3>
          <p className="body-m">{result.reason}</p>
          <p className="body-s muted">Unsure about an answer? That counts as a no, so you start lower. You can move up at any time.</p>
          <div className="start-actions">
            <button type="button" className="btn filled state" onClick={() => setBucket(result.bucket)} disabled={saved === result.bucket}>
              <Icon name={saved === result.bucket ? "check" : "bookmark"} />
              {saved === result.bucket ? "Saved as your bucket" : "Save this as my bucket"}
            </button>
            <button type="button" className="btn text state" onClick={() => setAnswers({})}>
              Start over
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function Start() {
  const { bucket: mine } = useBucketProgress();
  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Where to start with AI</h1>
        <p className="body-l muted measure">
          Three buckets, from first steps to building with AI, each with a short list of free courses from Google, OpenAI, Anthropic, DeepLearning.AI and
          others. Find yours, work through it at your own pace, and talk it over with other students.
        </p>
        {mine && (
          <p className="label-l progress-note">
            <Icon name="bookmark" filled size={20} />
            Your bucket: {mine}, {bucketById.get(mine)!.name}
          </p>
        )}
      </header>

      <section className="section" aria-labelledby="how-h">
        <h2 id="how-h" className="headline-m">
          How it works
        </h2>
        <ol className="start-steps body-l">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <Finder />

      {BUCKETS.map((b) => (
        <section key={b.id} className={`section start-bucket${mine === b.id ? " mine" : ""}`} aria-labelledby={`bucket-${b.id}`}>
          <h2 id={`bucket-${b.id}`} className="headline-m">
            Bucket {b.id}: {b.name}
          </h2>
          <p className="body-m measure">
            <strong>Who it's for:</strong> {b.who}.
          </p>
          <p className="body-m measure">
            <strong>Focus:</strong> {b.focus}. About {b.hours} for the core courses.
          </p>
          <CourseList bucket={b.id} />
        </section>
      ))}

      <section className="section" aria-labelledby="remind-h">
        <h2 id="remind-h" className="headline-m">
          A few reminders
        </h2>
        <ul className="start-steps body-l">
          <li>Courses are free to take, but some charge for certificates. You don't need a certificate to take part.</li>
          <li>Use a personal account for AI tools, and don't enter confidential or sensitive USC data into them.</li>
          <li>Check the course links before you begin, since course pages can change.</li>
        </ul>
        <p className="body-m">
          Want help choosing tools to go with the courses? Try the <Link to="/tools">tool finder</Link>, or ask the tutor.
        </p>
      </section>
    </>
  );
}
