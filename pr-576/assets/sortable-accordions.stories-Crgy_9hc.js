import{aX as o}from"./iframe-mQAVYY6e.js";import{S as R}from"./sortable-accordions-BoC1JhVa.js";import{P as f}from"./project-tag-b6B7Zfpl.js";import"./preload-helper-Dp1pzeXC.js";import"./sortable.esm-fzjplmXi.js";import"./index-DsJsThuq.js";import"./Select-ef7c0426.esm-B08OwgF5.js";import"./chevron-down-gnSZHF1I.js";import"./check-Cv313tEk.js";import"./use-media-query-qZhNNglu.js";import"./index-lSV0Jy08.js";var r,l,c,d,p,m,u,g,v,h,y,_,w,b,k;const{expect:t,userEvent:H,waitFor:j,within:x}=__STORYBOOK_MODULE_TEST__,D={title:"Components/SortableAccordions",component:R,parameters:{layout:"padded"},beforeEach:()=>{try{localStorage.removeItem("midnite.stories.accordions.order"),localStorage.removeItem("midnite.stories.accordions.collapsed")}catch{}}},B=[{id:"alpha",label:o.jsx("a",{href:"#alpha",onClick:e=>e.stopPropagation(),className:"hover:underline",children:"Alpha project"}),color:"#60a5fa",count:3,summary:"3 tasks",progress:{done:1,total:3},actions:o.jsx(f,{tag:"ALP",color:"#60a5fa"}),body:o.jsx("p",{className:"p-3 text-sm text-muted-foreground",children:"Alpha’s tasks live here."})},{id:"beta",label:o.jsx("a",{href:"#beta",onClick:e=>e.stopPropagation(),className:"hover:underline",children:"Beta project"}),color:"#34d399",count:1,summary:"1 task",body:o.jsx("p",{className:"p-3 text-sm text-muted-foreground",children:"Beta’s tasks live here."})}],n={args:{sections:B,storageKey:"midnite.stories.accordions",variant:"split"},play:async({canvasElement:e})=>{const a=x(e),A=a.getByRole("button",{name:/Alpha project/});await t(A).toHaveAttribute("aria-expanded","true"),await t(A.querySelector("a")).toBeNull(),await t(a.getByRole("link",{name:"Alpha project"})).toBeInTheDocument()}},s={args:{sections:B,storageKey:"midnite.stories.accordions",variant:"split"},play:async({canvasElement:e})=>{const a=x(e);await H.click(a.getByRole("button",{name:/Alpha project/})),await j(async()=>{await t(a.getByRole("button",{name:/Alpha project/})).toHaveAttribute("aria-expanded","false")}),await t(a.getByRole("button",{name:/Beta project/})).toHaveAttribute("aria-expanded","true")}},i={args:{sections:B,storageKey:"midnite.stories.accordions",variant:"split"},play:async({canvasElement:e})=>{const a=x(e);await H.click(a.getByText("3 tasks")),await j(async()=>{await t(a.getByRole("button",{name:/Alpha project/})).toHaveAttribute("aria-expanded","false")})}};n.parameters={...n.parameters,docs:{...(r=n.parameters)===null||r===void 0?void 0:r.docs,source:{originalSource:`{
  args: {
    sections: linkedSections,
    storageKey: 'midnite.stories.accordions',
    variant: 'split'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // The toggle is named by its heading and reports expanded state…
    const toggle = canvas.getByRole('button', {
      name: /Alpha project/
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // …and it does not contain the heading's link (that would nest a control).
    await expect(toggle.querySelector('a')).toBeNull();
    // The link is still reachable in its own right.
    await expect(canvas.getByRole('link', {
      name: 'Alpha project'
    })).toBeInTheDocument();
  }
}`,...(c=n.parameters)===null||c===void 0||(l=c.docs)===null||l===void 0?void 0:l.source},description:{story:"A heading link + trailing actions, with no interactive nesting.",...(p=n.parameters)===null||p===void 0||(d=p.docs)===null||d===void 0?void 0:d.description}}};s.parameters={...s.parameters,docs:{...(m=s.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    sections: linkedSections,
    storageKey: 'midnite.stories.accordions',
    variant: 'split'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: /Alpha project/
    }));
    await waitFor(async () => {
      await expect(canvas.getByRole('button', {
        name: /Alpha project/
      })).toHaveAttribute('aria-expanded', 'false');
    });
    await expect(canvas.getByRole('button', {
      name: /Beta project/
    })).toHaveAttribute('aria-expanded', 'true');
  }
}`,...(g=s.parameters)===null||g===void 0||(u=g.docs)===null||u===void 0?void 0:u.source},description:{story:"The toggle button collapses its own section and leaves siblings alone.",...(h=s.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.description}}};i.parameters={...i.parameters,docs:{...(y=i.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  args: {
    sections: linkedSections,
    storageKey: 'midnite.stories.accordions',
    variant: 'split'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // The count pill sits in the click surface, away from the link and the button.
    await userEvent.click(canvas.getByText('3 tasks'));
    await waitFor(async () => {
      await expect(canvas.getByRole('button', {
        name: /Alpha project/
      })).toHaveAttribute('aria-expanded', 'false');
    });
  }
}`,...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.source},description:{story:'Clicking the header row (not the button) still toggles — the mouse convenience\n that survived demoting the row from `role="button"` to a plain surface.',...(k=i.parameters)===null||k===void 0||(b=k.docs)===null||b===void 0?void 0:b.description}}};const F=["LinkedHeadings","CollapseViaToggleButton","CollapseViaHeaderRow"];export{i as CollapseViaHeaderRow,s as CollapseViaToggleButton,n as LinkedHeadings,F as __namedExportsOrder,D as default};
