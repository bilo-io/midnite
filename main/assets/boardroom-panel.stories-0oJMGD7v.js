import{n as T}from"./iframe-CQd7E9rJ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-D3qRvq6Z.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-D-Ui8QQ0.js";import"./index-CKzST0vR.js";import"./check-1gyhuiNx.js";import"./project-tag-B0HEsSEQ.js";import"./inbound-srGy8HMv.js";import"./project-modal-CNYEF5Jp.js";import"./export-menu-BATPk7dE.js";import"./client-CIE6WgLp.js";import"./markdown-preview-Ce0alZ0N.js";import"./index.dom-D_wTd2ti.js";import"./file-text-osqzkqRK.js";import"./copy-CTIfoR1T.js";import"./file-code-corner-DcZe0o9W.js";import"./loader-circle-CN6E96MV.js";import"./api-e81uAW5a.js";import"./folder-open-BkagkBQR.js";import"./folder-DuGkJeyP.js";import"./tag-color-picker-Ck5EOQmh.js";import"./source-list-editor-B-BdS8BC.js";import"./core.esm-BYnWcEjh.js";import"./source-icon-BSi-dNvc.js";import"./globe-BC-n4fKY.js";import"./sticky-note-zmuEdomF.js";import"./plus-BdCSHxhJ.js";import"./external-link-C32O_0Ue.js";import"./task-row-DCjjQ84P.js";import"./blocked-badge-CcrmmHYF.js";import"./selectable-icon-Bj6EruV9.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-C_GB0W6a.js";import"./pencil-epJRosQb.js";import"./trash-2-CyJf8waf.js";import"./confirm-dialog-BNoApUKx.js";import"./triangle-alert-CTn7uNWC.js";import"./refresh-cw-akydvQKr.js";import"./index-BT34iHP_.js";import"./lightbulb-Dxf4DrJ1.js";import"./templates-B6M1OYb3.js";import"./sparkles-BuZ9u89K.js";import"./brain-4BN0PKrV.js";import"./chevron-right-FkX2nPsY.js";import"./spinner-C6n1qhY-.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CplCqpr1.js";import"./useQuery-BbZS3zRu.js";import"./presentation-BIlmSegl.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const It=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,It as __namedExportsOrder,kt as default};
