import{n as T}from"./iframe-CMCZONSf.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-Dq14Rme2.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Cc1knxhb.js";import"./index-Cw0U76p2.js";import"./check-DN5yYC7t.js";import"./project-tag-D2tF2nel.js";import"./inbound-CbJZzwyX.js";import"./project-modal-p15LJiJd.js";import"./export-menu-EfZklpP4.js";import"./client-OEv1aSiz.js";import"./markdown-preview-Seq-JVcm.js";import"./file-text-CMJ908kx.js";import"./copy-tJwtjMKo.js";import"./loader-circle-lx2qMLY4.js";import"./api-A95bhGP6.js";import"./folder-open-Ygj-1jpW.js";import"./folder-DWw3kfQM.js";import"./tag-color-picker-BzL7dy8_.js";import"./source-list-editor-HqKO5Moi.js";import"./confirm-dialog-Abq9Ms0V.js";import"./triangle-alert-CSRgyG0o.js";import"./source-icon-DVRhByXA.js";import"./globe-DQsZ4p0x.js";import"./sticky-note-Drjl9omF.js";import"./plus-DhZkyQOA.js";import"./external-link-DLRI_m0E.js";import"./task-row-D2GsYqRL.js";import"./blocked-badge-D1yzvfhu.js";import"./selectable-icon-WOHUmuzJ.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CfvfKRT-.js";import"./pencil-BYHc9dWS.js";import"./trash-2-JwUB44iD.js";import"./refresh-cw-CgBRTrr_.js";import"./index-_AGFi5zq.js";import"./lightbulb-DFsuWQoz.js";import"./templates-B6M1OYb3.js";import"./sparkles-RenkBhdz.js";import"./brain-BwFqFF9J.js";import"./chevron-right-D3PkVdp5.js";import"./spinner-CApux4O7.js";import"./data-refresh-0RKNWRQ4.js";import"./useQuery-qOWuGv3X.js";import"./presentation-jukprMnL.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
