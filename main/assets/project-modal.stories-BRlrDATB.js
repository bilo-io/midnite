import{a_ as n,ax as R}from"./iframe-DQYCurDR.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CfcErPUO.js";import{P as H}from"./project-modal-BwgAQEhQ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-RhU0ttOv.js";import"./Select-ef7c0426.esm-CsYGENL7.js";import"./chevron-down-Bxyl9xQk.js";import"./check-C7AXBqFX.js";import"./index-D98OljXx.js";import"./export-menu-U4c-Ce15.js";import"./client-Dac-4Cl6.js";import"./markdown-preview-DJl57lpy.js";import"./index.dom-D_wTd2ti.js";import"./file-text-1jfLDmSQ.js";import"./copy-CdSTNKSi.js";import"./file-code-corner-De2whzbC.js";import"./loader-circle-C0y5ZRTY.js";import"./api-BeVJaIoh.js";import"./folder-open-BPPFB8-g.js";import"./folder-CnMKHgA_.js";import"./tag-color-picker-BzG80ESV.js";import"./project-tag-CBGyNJwA.js";import"./sparkles-DMGJvTgB.js";import"./brain-DYJ2OMxE.js";import"./chevron-right-Dl552J6N.js";import"./markdown-editor-DIncZNm1.js";import"./pencil-R_e056PL.js";import"./trash-2-DmAnjfMs.js";import"./templates-BodN5NKE.js";import"./plus-2vOSu1Om.js";import"./task-row-C-f3pIRh.js";import"./blocked-badge-BlA8QQ2m.js";import"./selectable-icon-FaaGIlMp.js";import"./hover-expand-button-pK9giuAi.js";import"./index-CBZfEUv9.js";import"./data-refresh-C34n8lAl.js";import"./rotate-ccw-CNd3Kvgi.js";import"./play-oBPkHuHM.js";import"./square-terminal-DaFzxThS.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BFHAMVsb.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
