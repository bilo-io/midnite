import{n as T}from"./iframe-CyuGqAe9.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-C_OJ1aLq.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Bcw8rFWd.js";import"./index-COiPRD0b.js";import"./check-CSptye5O.js";import"./project-tag-BWdYwb7a.js";import"./inbound-caimLB85.js";import"./project-modal-D4y4Okcm.js";import"./export-menu-CP90ijQE.js";import"./client-CDEJRvyS.js";import"./markdown-preview-DVRj_mZq.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BWd2yTs2.js";import"./copy-CdJtETwg.js";import"./file-code-corner-uXRIBg1X.js";import"./loader-circle-CJOGfB8B.js";import"./api-Bq8Fx77f.js";import"./folder-open-BliSWnFc.js";import"./folder-DVxss0Ri.js";import"./tag-color-picker-DWSBdoG-.js";import"./source-list-editor-2yJVqJ31.js";import"./core.esm-B1G10Q4o.js";import"./source-icon-CjIqIx4j.js";import"./globe-keD1o-8D.js";import"./sticky-note-CAwZ3pnW.js";import"./plus-BHzNSJCP.js";import"./external-link-BGpRonph.js";import"./task-row-LpGXLpIS.js";import"./blocked-badge-CCv8Ox3f.js";import"./selectable-icon-zwxUAkRr.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DaxTNJwp.js";import"./pencil-DBmv7oHt.js";import"./trash-2-BlhTDK1A.js";import"./confirm-dialog-C1EBX8mV.js";import"./triangle-alert-xbSOr64q.js";import"./refresh-cw-CRltIGHy.js";import"./index-Bire4uIk.js";import"./lightbulb-DwbT8-nm.js";import"./templates-B6M1OYb3.js";import"./sparkles-qpd10359.js";import"./brain-CADE1CQ_.js";import"./chevron-right-DITEDcg9.js";import"./spinner-BwwJECnL.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BgzSduZ-.js";import"./useQuery-Bye5SmfI.js";import"./presentation-CxVa-jgE.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
