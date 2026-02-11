import EmbedLabNoSSR from "./components/embed-lab/EmbedLabNoSSR";

export default function Home() {
  return (
    <div className="nebula-shell">
      <main className="nebula-content mx-auto w-full max-w-[1760px] px-3 pb-10 pt-8 sm:px-5 lg:px-7">
        <EmbedLabNoSSR />
      </main>
    </div>
  );
}
