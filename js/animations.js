/*
  Page reveal animations (GSAP + ScrollTrigger + SplitText).
  Transform and opacity only. The ticker track is never touched.
  If GSAP fails to load, .js-anim is removed so everything stays visible.
*/
(() => {
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    document.documentElement.classList.remove("js-anim");
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.remove("js-anim");
    return () => {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("js-anim");
      }
    };
  });

  mm.add(
    {
      isMobile: "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)",
      isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    },
    (context) => {
      const { isMobile } = context.conditions;
      const yCard = isMobile ? 16 : 30;
      const yText = isMobile ? 16 : 20;
      const duration = isMobile ? 0.55 : 0.8;
      const lineDuration = isMobile ? 0.6 : 0.8;
      const ease = "power3.out";
      const view = {
        start: "top 85%",
        once: true,
        toggleActions: "play none none none",
      };
      const splits = [];

      const fadeUp = (targets, vars = {}) => {
        const nodes = gsap.utils.toArray(targets);
        if (!nodes.length) return;
        return gsap.from(nodes, {
          y: yText,
          opacity: 0,
          duration,
          ease,
          ...vars,
        });
      };

      const splitLines = (el, vars = {}) => {
        if (!el) return;
        const split = SplitText.create(el, {
          type: "lines",
          linesClass: "anim-line",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 100,
              stagger: 0.1,
              duration: lineDuration,
              ease,
              ...vars,
            });
          },
        });
        splits.push(split);
        return split;
      };

      /* 1–2. Section headings + the copy that sits under them */
      gsap.utils.toArray("h2.section-title").forEach((heading) => {
        splitLines(heading, {
          scrollTrigger: { trigger: heading, ...view },
        });
      });

      fadeUp(".coop-intro", {
        delay: 0.2,
        scrollTrigger: { trigger: "#wspolpraca-title", ...view },
      });

      fadeUp(".contact-lead", {
        delay: 0.2,
        scrollTrigger: { trigger: "#kontakt .contact-title", ...view },
      });

      /* 3. Hero — on load, not on scroll. Sequence stays under ~1.2s. */
      const heroHeading = document.querySelector(".hero-copy h1");
      const heroBadge = document.querySelector(".hero-titles .badge");
      const heroLead = document.querySelector(".hero-lead");
      const heroCta = document.querySelector(".hero-copy .btn-xl");
      const heroImage = document.querySelector(".hero-doctor");
      const heroBits = [heroBadge, heroHeading, heroLead, heroCta, heroImage].filter(Boolean);
      gsap.set(heroBits, { opacity: 0 });
      document.documentElement.classList.add("is-anim-ready");

      if (heroHeading) {
        splits.push(
          SplitText.create(heroHeading, {
            type: "lines",
            linesClass: "anim-line",
            mask: "lines",
            autoSplit: true,
            onSplit(self) {
              gsap.set(heroHeading, { opacity: 1 });
              const tl = gsap.timeline({ defaults: { ease } });
              if (heroImage) {
                tl.fromTo(
                  heroImage,
                  { opacity: 0, scale: 1.04 },
                  { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out", clearProps: "transform" },
                  0,
                );
              }
              if (heroBadge) {
                tl.fromTo(heroBadge, { y: yText, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32 }, 0);
              }
              tl.from(self.lines, { yPercent: 100, duration: 0.5, stagger: 0.08 }, 0.12);
              if (heroLead) {
                tl.fromTo(heroLead, { y: yText, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32 }, 0.5);
              }
              if (heroCta) {
                tl.fromTo(
                  heroCta,
                  { y: yText, opacity: 0 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.3,
                    clearProps: "all",
                  },
                  0.68,
                );
              }
              return tl;
            },
          }),
        );
      }

      /* 4. Co daje — tabs on desktop; scroller wrapper once on mobile */
      const tabs = gsap.utils.toArray(".benefits-tab");
      const benefitsDeck = document.querySelector(".benefits-cards");
      if (isMobile) {
        if (benefitsDeck) {
          gsap.from(benefitsDeck, {
            y: yText,
            opacity: 0,
            duration,
            ease,
            delay: 0.15,
            scrollTrigger: { trigger: benefitsDeck, ...view },
            clearProps: "transform",
          });
        }
      } else {
        if (tabs.length) {
          gsap.from(tabs, {
            x: -24,
            opacity: 0,
            stagger: 0.08,
            duration,
            ease,
            delay: 0.15,
            scrollTrigger: { trigger: ".benefits-tabs", ...view },
            clearProps: "transform",
          });
        }
        if (benefitsDeck) {
          gsap.from(benefitsDeck, {
            y: yText,
            opacity: 0,
            duration,
            ease,
            delay: 0.22,
            scrollTrigger: { trigger: benefitsDeck, ...view },
            clearProps: "transform",
          });
        }
      }

      /* 5. Pricing */
      gsap.utils.toArray(".pricing-group").forEach((group) => {
        const heading = group.querySelector(".pricing-heading");
        const table = group.querySelector(".pricing-table");
        const rows = group.querySelectorAll(".pricing-table tbody tr");
        const card = group.querySelector(".price-card");

        if (heading) {
          fadeUp(heading, { scrollTrigger: { trigger: heading, ...view } });
        }
        if (table) {
          gsap.from(table, {
            y: yText,
            opacity: 0,
            duration,
            ease,
            scrollTrigger: { trigger: table, ...view },
          });
        }
        if (rows.length) {
          gsap.from(rows, {
            y: isMobile ? 10 : 12,
            opacity: 0,
            duration: duration * 0.75,
            stagger: 0.05,
            ease,
            delay: 0.08,
            scrollTrigger: { trigger: table || group, ...view },
          });
        }
        if (card) {
          gsap.from(card, {
            y: yText,
            opacity: 0,
            scale: 0.97,
            duration,
            ease,
            scrollTrigger: { trigger: card, ...view },
            clearProps: "transform",
          });
        }
      });

      /* 6. Współpraca steps — clear transform so the mobile scroller stays intact */
      const steps = gsap.utils.toArray(".step-card");
      if (steps.length) {
        gsap.from(steps, {
          y: yCard,
          opacity: 0,
          stagger: 0.1,
          duration,
          ease,
          delay: 0.12,
          scrollTrigger: { trigger: ".steps", ...view },
          clearProps: "transform",
        });
      }

      /* 7. Contact: copy + form, then the agent card. Buttons are not animated. */
      fadeUp(".form-card", {
        delay: 0.12,
        scrollTrigger: { trigger: ".form-card", ...view },
      });
      fadeUp(".agent-card", {
        delay: 0.22,
        scrollTrigger: { trigger: ".agent-card", ...view },
      });

      document.fonts.ready.then(() => ScrollTrigger.refresh());
      if (document.readyState === "complete") ScrollTrigger.refresh();
      else window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

      return () => {
        splits.forEach((split) => split.revert());
      };
    },
  );
})();
