import{P as I}from"./project-progress-Bim1mSNc.js";import"./iframe-Cg2o_Bk-.js";import"./preload-helper-Dp1pzeXC.js";import"./site-links-BhZk_F72.js";import"./task-columns-DXf2yYcn.js";var d,i,l,p,u,v,m,_,y,b,g,w,B,T,h,k,C,x,A,D;const{expect:o,within:c}=__STORYBOOK_MODULE_TEST__,R={title:"Components/ProjectProgressBar",component:I},n={args:{project:{taskStatusCounts:{todo:2,wip:1,done:3},taskCount:6}},play:async({canvasElement:e})=>{const a=c(e),H=a.getByRole("progressbar");await o(H).toHaveAttribute("aria-valuenow","50"),await o(a.getByText("3/6 · 50%")).toBeInTheDocument()}},t={args:{project:{taskStatusCounts:{done:2,abandoned:1,todo:1}}},play:async({canvasElement:e})=>{const a=c(e);await o(a.getByRole("progressbar")).toHaveAttribute("aria-valuenow","50")}},s={args:{done:4,total:5,hideLabel:!0},play:async({canvasElement:e})=>{const a=c(e);await o(a.getByRole("progressbar")).toHaveAttribute("aria-valuenow","80"),await o(a.queryByText(/%/)).not.toBeInTheDocument()}},r={args:{project:{taskStatusCounts:{}}},play:async({canvasElement:e})=>{const a=c(e);await o(a.queryByRole("progressbar")).not.toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project: {
      taskStatusCounts: {
        todo: 2,
        wip: 1,
        done: 3
      },
      taskCount: 6
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '50');
    await expect(canvas.getByText('3/6 · 50%')).toBeInTheDocument();
  }
}`,...(l=n.parameters)===null||l===void 0||(i=l.docs)===null||i===void 0?void 0:i.source},description:{story:"Half done, with the label — from a project's server status breakdown.",...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};t.parameters={...t.parameters,docs:{...(v=t.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    project: {
      taskStatusCounts: {
        done: 2,
        abandoned: 1,
        todo: 1
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  }
}`,...(_=t.parameters)===null||_===void 0||(m=_.docs)===null||m===void 0?void 0:m.source},description:{story:"Abandoned tasks count toward the total, so the % is 2/4 not 2/3.",...(b=t.parameters)===null||b===void 0||(y=b.docs)===null||y===void 0?void 0:y.description}}};s.parameters={...s.parameters,docs:{...(g=s.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    done: 4,
    total: 5,
    hideLabel: true
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    await expect(canvas.queryByText(/%/)).not.toBeInTheDocument();
  }
}`,...(B=s.parameters)===null||B===void 0||(w=B.docs)===null||w===void 0?void 0:w.source},description:{story:"Explicit done/total (page has tasks already), bar-only.",...(h=s.parameters)===null||h===void 0||(T=h.docs)===null||T===void 0?void 0:T.description}}};r.parameters={...r.parameters,docs:{...(k=r.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  args: {
    project: {
      taskStatusCounts: {}
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
  }
}`,...(x=r.parameters)===null||x===void 0||(C=x.docs)===null||C===void 0?void 0:C.source},description:{story:"No tasks → the bar renders nothing at all.",...(D=r.parameters)===null||D===void 0||(A=D.docs)===null||A===void 0?void 0:A.description}}};const N=["HalfDone","AbandonedCountsInTotal","BarOnly","NoTasks"];export{t as AbandonedCountsInTotal,s as BarOnly,n as HalfDone,r as NoTasks,N as __namedExportsOrder,R as default};
