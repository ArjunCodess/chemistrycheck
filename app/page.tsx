import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, MoveRight } from "lucide-react";
import Link from "next/link";
import Demo from "@/components/landing/demo";
import Image from "next/image";
import Footer from "@/components/shared/footer";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[90rem] py-12 sm:py-20 md:py-28 lg:py-36 px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            <div className="my-auto">
              <div className="flex flex-col items-center lg:items-start gap-6 md:gap-8 max-w-lg text-center lg:text-left mx-auto lg:mx-0">
                <h1
                  className={cn(
                    "relative tracking-tight font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-neutral-900 leading-tight sm:leading-[3.25rem] md:leading-[4rem]"
                  )}
                >
                  ChemistryCheck
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-balance">
                  Decode your chats. Understand your relationships. Get{" "}
                  <span className={cn("font-bold text-primary-600")}>
                    brutally honest
                  </span>{" "}
                  insights about what&apos;s really happening between the lines.
                  Spot warning signs early. No more &ldquo;Wish I would&apos;ve
                  seen this coming.&ldquo;
                </p>

                <ul className="w-full space-y-2 font-medium text-sm sm:text-base md:text-lg text-balance">
                  <div className="space-y-2">
                    <li className="flex gap-1.5 items-center text-left">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary-600" />{" "}
                      Upload WhatsApp, Telegram, or Instagram chats
                    </li>
                    <li className="flex gap-1.5 items-center text-left">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary-600" />{" "}
                      AI-powered relationship insights
                    </li>
                    <li className="flex gap-1.5 items-center text-left">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary-600" />{" "}
                      Spot red flags and communication patterns
                    </li>
                    <li className="flex gap-1.5 items-center text-left">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary-600" />{" "}
                      Open source & files deleted after analysis
                    </li>
                  </div>
                </ul>
                <Link href="/new" className="w-full mt-2">
                  <Button variant="default" className="w-full">
                    Analyze Your Chats
                    <MoveRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="my-auto">
              <div className="relative mt-16 sm:mt-12 lg:mt-0">
                <Image
                  src="/this-you.png"
                  alt="This you?"
                  width={300}
                  height={300}
                  className="absolute w-36 sm:w-48 right-0 -top-10 sm:left-2/3 sm:-top-14 select-none"
                />
                <Demo />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary-100 bg-[url('/base.png')] bg-repeat bg-blend-multiply px-4">
        <div className="mx-auto max-w-6xl gap-6 py-16 sm:py-24 lg:py-32 lg:gap-x-8 lg:px-8">
          <div className="w-full flex flex-col">
            <div className="flex flex-col justify-center text-center gap-2">
              <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance sm:leading-none tracking-tight px-2">
                <span className="bg-primary-700 text-white rounded-lg px-2 sm:px-4 block sm:inline w-fit mx-auto sm:mx-0">
                  Does she even
                </span>{" "}
                <i>like</i> me?
              </h2>
              <p className="text-lg italic mt-2">
                - you, after re-reading &ldquo;lol ok&rdquo; for the 27th time
              </p>
            </div>

            <p className="text-center mx-auto mt-8 sm:mt-12 text-base sm:text-lg max-w-xl text-balance px-2">
              <span className="font-semibold">
                Chatting is easy. Understanding isn&apos;t.
              </span>{" "}
              You send memes, share playlists, talk for hours - but you&apos;re
              still stuck decoding her &ldquo;hmm&rdquo; at 1:43am.
            </p>

            <p className="text-center mx-auto mt-4 text-base sm:text-lg max-w-xl text-balance px-2">
              Does she care?
              <br />
              Is she bored?
              <br />
              Is this just ✨ trauma bonding ✨<br />
              or something real?
            </p>

            <p className="text-center mx-auto mt-4 text-base sm:text-lg max-w-xl text-balance px-2">
              You&apos;re not delusional. You&apos;re just in a texting
              situationship without a compass.
            </p>

            <div className="max-w-3xl mx-auto mt-12 sm:mt-16 text-center px-4">
              <h3 className="font-bold text-xl sm:text-2xl">
                Conversations don&apos;t lie. But they do get messy.
              </h3>

              <div className="grid gap-8 sm:grid-cols-3 sm:gap-12 mt-8">
                <div className="relative z-10">
                  <p className="text-lg italic text-primary-700">
                    75% of the apologies
                    <br />
                    come from you.
                  </p>
                </div>

                <div className="relative z-10">
                  <p className="text-lg italic text-primary-700">
                    You send paragraphs.
                    <br />
                    She sends &ldquo;lol&rdquo;.
                  </p>
                </div>

                <div className="relative z-10">
                  <p className="text-lg italic text-primary-700">
                    You&apos;ve been ghosted.
                    <br />
                    But in slow motion.
                  </p>
                </div>
              </div>

              <div className="mt-12 sm:mt-16">
                <h3 className="font-bold text-xl sm:text-2xl">
                  ChemistryCheck reads between the lines.
                </h3>
                <p className="mt-4">
                  Upload your WhatsApp, Telegram, or Insta chats. Get brutally
                  honest AI-powered insights:
                </p>

                <ul className="mt-4 space-y-2 text-center flex flex-col justify-center items-center">
                  <li className="flex items-center gap-2">
                    <span className="text-xl">📊</span> Who cares more.{" "}
                    <span className="text-xl">📊</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-xl">🚩</span> Where the red flags
                    hide. <span className="text-xl">🚩</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-xl">❤️</span> Whether this is love -
                    or just loneliness dressed in dopamine.{" "}
                    <span className="text-xl">❤️</span>
                  </li>
                </ul>

                <p className="mt-8 font-medium">
                  Built by someone who lost. For those still losing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4">
              See a{" "}
              <span className="bg-primary-700 text-white rounded-lg px-2 sm:px-4 block sm:inline w-fit mx-auto sm:mx-0">
                Real Analysis
              </span>
            </h2>
            <p className="text-lg max-w-xl mx-auto text-neutral-600">
              Here&apos;s an example of what your chat analysis will look like.
              Explore this public sample to see our insights in action.
            </p>
          </div>

          <div className="relative w-full border overflow-hidden rounded-md border-neutral-200 shadow-lg">
            <div className="h-[30rem] sm:h-[40rem] md:h-[50rem] w-full">
              <iframe
                src="https://chemistrycheck.vercel.app/analysis/75e54800-baa6-474f-804c-e965c1267b4e"
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary-100 bg-[url('/base.png')] bg-repeat bg-blend-multiply px-4">
        <div className="mx-auto max-w-6xl gap-6 py-16 sm:py-24 lg:py-32 lg:gap-x-8 lg:px-8">
          <h2 className="mx-auto text-balance text-3xl sm:text-5xl lg:text-6xl text-center font-bold leading-tight sm:leading-[4.25rem] tracking-tight max-w-2xl text-slate-900 px-4">
            Upload your chat{" "}
            <span className="px-2 sm:px-4 bg-primary-700 rounded-lg text-white">
              now
            </span>
          </h2>

          <p className="text-center mx-auto mt-8 sm:mt-12 text-base sm:text-lg max-w-xl text-balance px-4">
            <span className="font-semibold">
              Get honest insights in seconds!
            </span>{" "}
            Upload your chat history and let our AI analyze what&apos;s really
            happening between the lines.
          </p>

          <div className="mt-12 text-center">
            <Link href="/new">
              <Button className="w-full md:w-sm">
                Upload your chat
                <MoveRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
