import { useState } from 'react';
import { Container } from '../ui/Container';
import { SectionKicker } from '../ui/SectionKicker';
import { FAQ as FAQ_ITEMS } from '../../content/faq';

function AccordionItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-kicker text-base uppercase tracking-wide2 text-lf-white sm:text-lg">
          {question}
        </span>
        <span className="font-display text-2xl text-lf-gold">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-5 text-sm text-lf-cream/75">{answer}</p>}
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const groups: Array<'Product' | 'Ordering'> = ['Product', 'Ordering'];

  return (
    <section id="faq" className="bg-lf-charcoal py-20 sm:py-28">
      <Container className="max-w-3xl">
        <div className="text-center">
          <SectionKicker>FAQ</SectionKicker>
          <h2 className="text-4xl text-lf-white sm:text-5xl">Questions, Answered</h2>
        </div>

        {groups.map((group) => (
          <div key={group} className="mt-12">
            <h3 className="mb-2 font-kicker text-sm uppercase tracking-wide2 text-lf-gold">
              {group}
            </h3>
            {FAQ_ITEMS.filter((f) => f.group === group).map((item) => {
              const globalIndex = FAQ_ITEMS.indexOf(item);
              return (
                <AccordionItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                  open={openIndex === globalIndex}
                  onToggle={() => setOpenIndex(openIndex === globalIndex ? null : globalIndex)}
                />
              );
            })}
          </div>
        ))}
      </Container>
    </section>
  );
}
