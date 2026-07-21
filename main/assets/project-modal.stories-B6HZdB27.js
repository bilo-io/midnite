import{aX as n,aw as R}from"./iframe-Chfe_yyu.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Ce5fatEw.js";import{P as H}from"./project-modal-BJ4b_LZI.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CCrl9ZdV.js";import"./Select-ef7c0426.esm-dke19RAq.js";import"./chevron-down-CD2txmuJ.js";import"./check-C-N8ojlB.js";import"./index-C8aWVn71.js";import"./triangle-alert-DHh26j0A.js";import"./export-menu-BMgsV09H.js";import"./client-Dn_07fsb.js";import"./markdown-preview-CHn_BAqL.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DxW42wT2.js";import"./copy-wv8gmsS-.js";import"./file-code-corner-Bmqg-70x.js";import"./loader-circle-DwNLM3qU.js";import"./api-Bw2TaCuL.js";import"./folder-open-CBfTqjmP.js";import"./folder-CSJM9aVX.js";import"./tag-color-picker-DJD5s_3X.js";import"./project-tag-CXluQ5Xk.js";import"./sparkles-Ca79iEfx.js";import"./brain-NMp1pRam.js";import"./chevron-right-CgTgQd19.js";import"./markdown-editor-BhaeTSC4.js";import"./pencil-DNwvajXr.js";import"./trash-2-NruoWCGm.js";import"./templates-B6M1OYb3.js";import"./plus-k-gCTPaN.js";import"./task-row-BlP54nNb.js";import"./blocked-badge-BAlZ9yhl.js";import"./selectable-icon-DhuIH_8f.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C31ZjFv4.js";import"./arrow-left-C1Em4siw.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
